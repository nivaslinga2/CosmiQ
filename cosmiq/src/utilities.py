
import numpy as np

# Try to import Gurobi (commercial solver) - fallback if not available
try:
    from gurobipy import Model, GRB
    GUROBI_AVAILABLE = True
except ImportError:
    GUROBI_AVAILABLE = False
    Model = None
    GRB = None

def generate_orbital_constellation(n_nodes, seed):
    """
    Generate a 3D LEO satellite constellation.
    Satellites are positioned in a spherical orbital shell.
    """
    np.random.seed(seed)
    coords = []
    names = []
    
    for i in range(n_nodes):
        # Random spherical coordinates for a shell
        phi = np.random.uniform(0, 2 * np.pi)
        theta = np.random.uniform(np.pi/4, 3 * np.pi / 4) # Focused around the equator for visibility
        radius = 1.0 + np.random.normal(0, 0.02) # Orbital shell with slight altitude variation
        
        x = radius * np.sin(theta) * np.cos(phi)
        y = radius * np.sin(theta) * np.sin(phi)
        z = radius * np.cos(theta)
        coords.append([x, y, z])
        names.append(f"Sim-Sat {i}")
        
    coords = np.array(coords)
    dist_matrix = np.zeros((n_nodes, n_nodes))
    for i in range(n_nodes):
        for j in range(n_nodes):
            # Distance represents Latency (ms) 
            dist_matrix[i, j] = np.linalg.norm(coords[i] - coords[j]) * 50 
            
    return coords, dist_matrix, names, [] # Return empty TLEs for simulated data

def solve_tsp_brute_force(dist_matrix):
    """
    Solve TSP via brute force (O(N!)).
    """
    import itertools
    n = len(dist_matrix)
    nodes = list(range(n))
    min_path = None
    min_dist = float('inf')
    
    # Check all permutations starting at 0 to reduce N! to (N-1)!
    for p in itertools.permutations(nodes[1:]):
        path = [0] + list(p)
        d = 0
        for i in range(n):
            d += dist_matrix[path[i], path[(i+1)%n]]
        if d < min_dist:
            min_dist = d
            min_path = path
            
    return min_dist, min_path

def fetch_real_satellite_data(group="starlink", n_nodes=5):
    """
    Fetch real-time satellite positions from CelesTrak and return TLEs.
    """
    import requests
    from skyfield.api import load, EarthSatellite
    from datetime import datetime, timezone

    # Mapping groups to Celestrak categories
    url = f"https://celestrak.org/NORAD/elements/gp.php?GROUP={group}&FORMAT=tle"
    
    try:
        response = requests.get(url, timeout=10)
        if response.status_code != 200:
            return None, None, None, None
        
        lines = response.text.strip().split('\n')
        all_sats_data = []
        # TLE is 3 lines per satellite (Name, Line 1, Line 2)
        for i in range(0, len(lines), 3):
            if i+2 >= len(lines): break
            name = lines[i].strip()
            line1 = lines[i+1].strip()
            line2 = lines[i+2].strip()
            all_sats_data.append({
                'name': name,
                'l1': line1,
                'l2': line2,
                'obj': EarthSatellite(line1, line2, name)
            })
        
        # Take a subset of satellites
        if len(all_sats_data) > n_nodes:
            # Deterministic subset for consistency in one session
            subset = all_sats_data[:n_nodes]
        else:
            subset = all_sats_data
            
        names = [s['name'] for s in subset]
        tles = [[s['l1'], s['l2']] for s in subset]
            
        ts = load.timescale()
        t = ts.now()
        
        coords = []
        for s in subset:
            geocentric = s['obj'].at(t)
            # Position in km
            pos = geocentric.position.km
            # Scale down for visualization (Earth radius ~6371km)
            # Earth in our 3D view is radius 5. Orbit is scale 7.5.
            # So Normalize by Earth radius and multiply by 5.0
            norm_pos = pos / 6371.0 * 5.0
            coords.append(norm_pos.tolist())
            
        coords = np.array(coords)
        
        # Calculate distance matrix (Latency in ms)
        dist_matrix = np.zeros((len(coords), len(coords)))
        for i in range(len(coords)):
            for j in range(len(coords)):
                # Distance in normalized units * 50 for ms approximation
                dist_matrix[i, j] = np.linalg.norm(coords[i] - coords[j]) * 50
                
        return coords, dist_matrix, names, tles
    except Exception as e:
        print(f"Error fetching real satellite data: {e}")
        return None, None, None, None
