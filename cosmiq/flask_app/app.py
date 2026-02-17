import sys
import os
import json
import time
import numpy as np
import plotly.graph_objects as go
import plotly.utils
from flask import Flask, render_template, request, jsonify

# --- Application Imports ---
try:
    from cosmiq.src.utilities import (
        generate_orbital_constellation,
        solve_tsp_brute_force,
        fetch_real_satellite_data,
        GUROBI_AVAILABLE
    )
    from cosmiq.src.QAOA_qiskit import qaoa_tsp, QISKIT_AVAILABLE
except ImportError:
    # Fallback for local execution
    from src.utilities import generate_orbital_constellation, solve_tsp_brute_force, fetch_real_satellite_data, GUROBI_AVAILABLE
    from src.QAOA_qiskit import qaoa_tsp, QISKIT_AVAILABLE

app = Flask(__name__)

# --- Helper Functions ---
def create_plot_tsp(coords, path, title, color='#00E5FF', names=None):
    """
    Creates a 3D Plotly visualization of the routing path.
    """
    fig = go.Figure()
    
    # 1. Draw Satellites with Labels
    labels = names if names else [f"Sat {i}" for i in range(len(coords))]
    
    fig.add_trace(go.Scatter3d(
        x=coords[:,0], y=coords[:,1], z=coords[:,2],
        mode='markers+text',
        marker=dict(
            size=10, 
            color=color, 
            opacity=1.0, 
            line=dict(color='white', width=2)
        ),
        text=labels,
        textposition="top center",
        textfont=dict(
            family="Inter, Roboto, Arial",
            size=14,
            color="white"
        ),
        name='Satellites'
    ))
    
    # 2. Draw Routing Path
    if path:
        full_path = path + [path[0]] # Close the loop
        px = [coords[i][0] for i in full_path]
        py = [coords[i][1] for i in full_path]
        pz = [coords[i][2] for i in full_path]
        fig.add_trace(go.Scatter3d(
            x=px, y=py, z=pz,
            mode='lines',
            line=dict(color=color, width=5),
            name='Routing Path'
        ))

    fig.update_layout(
        title=title,
        template='plotly_dark',
        margin=dict(l=0, r=0, b=0, t=50),
        scene=dict(
            xaxis=dict(visible=False),
            yaxis=dict(visible=False),
            zaxis=dict(visible=False),
            bgcolor='rgba(0,0,0,0)'
        ),
        paper_bgcolor='rgba(0,0,0,0)',
        plot_bgcolor='rgba(0,0,0,0)',
        showlegend=False
    )
    return fig


# --- Routes ---

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/run_simulation', methods=['POST'])
def run_simulation():
    try:
        data = request.json
        
        # Extract params
        n_nodes = int(data.get('n_nodes', 4))
        # TSP scales as N^2 qubits. 
        # Clamp N to 5 to avoid crashing user's local sim or timing out
        if n_nodes > 5: n_nodes = 5 # Force limit for safety
        
        seed = int(data.get('seed', 42))
        quantum_backend = data.get('quantum_backend', 'simulator')
        ibm_token = os.getenv('IBM_QUANTUM_TOKEN', '')
        
        # 1. Generate/Fetch Orbital Constellation
        constellation_source = data.get('constellation_source', 'simulated')
        constellation_group = data.get('constellation_group', 'starlink')

        try:
            tles = []
            if constellation_source == 'real_time':
                coords, dist_matrix, names, tles = fetch_real_satellite_data(constellation_group, n_nodes)
                if coords is None:
                    coords, dist_matrix, names, tles = generate_orbital_constellation(n_nodes, seed)
            else:
                coords, dist_matrix, names, tles = generate_orbital_constellation(n_nodes, seed)
        except Exception as e:
            return jsonify({'error': f"Constellation Generation Failed: {str(e)}"}), 500

        # 2. Classical Algorithm (Brute Force for small N)
        start_c = time.time()
        c_cost, c_path = solve_tsp_brute_force(dist_matrix)
        end_c = time.time()
        
        # 3. Quantum Algorithm
        start_q = time.time()
        try:
            q_cost, q_path = qaoa_tsp(
                dist_matrix, 
                layer_count=int(data.get('num_layers', 1)),
                backend_name=quantum_backend,
                ibm_token=ibm_token
            )
        except Exception as e:
             return jsonify({'error': f"Quantum simulation failed: {str(e)}"}), 500
        end_q = time.time()
        
        # 4. Topology Visualizations
        fig_c = create_plot_tsp(coords, c_path, "Classical Orbital Topology", color='#0068C9', names=names)
        fig_q = create_plot_tsp(coords, q_path, "Quantum Orbital Topology", color='#AECBFA', names=names)
        
        # 5. Performance Chart
        fig_perf = go.Figure(data=[
            go.Bar(name='Dijkstra (Classical)', x=['Total Latency'], y=[c_cost], marker_color='#0068C9'),
            go.Bar(name='QAOA (Quantum)', x=['Total Latency'], y=[q_cost], marker_color='#AECBFA')
        ])
        fig_perf.update_layout(
             barmode='group', title="Latency Comparison (ms) - Lower is Better",
             paper_bgcolor='rgba(0,0,0,0)', plot_bgcolor='rgba(0,0,0,0)',
             font=dict(color='white')
        )

        results = {
            'classical_cost': float(f"{c_cost:.2f}"),
            'classical_time': end_c - start_c,
            'quantum_cost': float(f"{q_cost:.2f}"),
            'quantum_time': end_q - start_q,
            'path': q_path,
            'actual_n': n_nodes,
            'names': names,
            'coords': coords.tolist(),
            'tles': tles,
            'c_path': c_path,
            'q_path': q_path,
            'plots': {
                'classical': json.loads(json.dumps(fig_c, cls=plotly.utils.PlotlyJSONEncoder)),
                'quantum': json.loads(json.dumps(fig_q, cls=plotly.utils.PlotlyJSONEncoder)),
                'performance': json.loads(json.dumps(fig_perf, cls=plotly.utils.PlotlyJSONEncoder))
            }
        }
        
        # --- Firebase Integration ---
        try:
            from cosmiq.src.firebase_handler import save_experiment_result
            save_experiment_result(results)
        except Exception as e:
            print(f"Firebase save failed: {e}")

        return jsonify(results)
    except Exception as e:
        return jsonify({'error': f"Critical Server Error: {str(e)}"}), 500

@app.route('/history', methods=['GET'])
def get_history():
    try:
        try:
            from cosmiq.src.firebase_handler import init_firebase
        except ImportError:
            from src.firebase_handler import init_firebase
        db = init_firebase()
        if not db:
            return jsonify([])
        
        # Get last 10 experiments
        docs = db.collection('experiments').order_by('timestamp', direction='DESCENDING').limit(10).stream()
        history = []
        for doc in docs:
            d = doc.to_dict()
            # Remove plots to save bandwidth
            if 'plots' in d: del d['plots']
            history.append(d)
        return jsonify(history)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)

