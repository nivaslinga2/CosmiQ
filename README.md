# cosmiQ: Quantum Orbital Traffic Control

![cosmiQ Logo](https://img.shields.io/badge/Status-Active-brightgreen) ![Quantum](https://img.shields.io/badge/Technology-Quantum%20Computing-blueviolet) ![Python](https://img.shields.io/badge/Built%20With-Python-blue)

**cosmiQ** is an interactive optimization system and educational platform designed to solve path selection challenges in dynamic Low Earth Orbit (LEO) satellite networks. By leveraging the **Quantum Approximate Optimization Algorithm (QAOA)**, cosmiQ demonstrates the practical application of quantum computing in modern aerospace logistics.

---

## 🚀 The Challenge

The exponential growth of modern satellite constellations (such as Starlink) introduces a highly dynamic networking environment. As satellites rapidly move and network topologies constantly change, calculating the most efficient, lowest-latency routing paths becomes exponentially more difficult for classical computers—a problem mathematically related to the Traveling Salesperson Problem (TSP).

## 💡 Our Solution & Learning Mission

cosmiQ serves a dual purpose:
1. **Practical Optimization:** It acts as a routing solver that applies quantum algorithms against classical benchmarks (like Dijkstra/Brute-Force) in real-time.
2. **Interactive Quantum Education:** We aim to raise awareness and close the knowledge gap surrounding quantum utility. By providing an interactive 3D dashboard where users can tune quantum parameters and visually compare quantum vs. classical performance side-by-side, we turn complex quantum logistics into an accessible learning experience.

---

## ✨ Key Features

- **Dynamic Orbital Node Generation:** Simulate randomized or real-time LEO topologies.
- **Quantum Routing Engine:** Utilizes IBM Qiskit (QAOA and Aer Simulator) to execute quantum circuits for path optimization.
- **Classical Benchmarking:** Compares quantum solutions against standard classical routing algorithms.
- **Mission Control Dashboard:** A sleek, user-friendly interface featuring real-time 3D spatial routing visualizations using Plotly.
- **Historical Logging:** Integrated Firebase logging allows users to experiment, track performance, and learn from past simulations.

---

## 🛠 Tech Stack

- **Frontend:** HTML, CSS (Vanilla Custom Design), JavaScript, Plotly.js
- **Backend:** Python (Flask, Gunicorn)
- **Quantum Engine:** IBM Qiskit, Qiskit-Aer, Qiskit-Optimization
- **Database/Logging:** Firebase Admin SDK
- **Data/Math:** NumPy, Skyfield (for TLE and satellite tracking)

---

## 💻 Getting Started (Local Setup)

Follow these instructions to run the cosmiQ web application locally.

### 1. Prerequisites
Ensure you have Python 3.8+ installed on your system.

### 2. Clone the Repository
```bash
git clone https://github.com/yourusername/GDG-main.git
cd GDG-main
```

### 3. Install Dependencies
Install all required Python packages via the provided requirements file:
```bash
pip install -r requirements.txt
```

### 4. Environment Variables
Create a `.env` file in the root directory. If you plan to use real quantum hardware, include your IBM Quantum Token:
```env
IBM_QUANTUM_TOKEN=your_ibm_token_here
```

*(Note: You'll also need to configure your `firebase_key.json` if you wish to use the historical logging features.)*

### 5. Run the Application
```bash
python app.py
```
The application will start locally on `http://127.0.0.1:5000`. Open this URL in your browser to access the Mission Control dashboard.

---

## 🔮 Future Scope

- **Scale Beyond Limitations:** Integrate real IBM Quantum hardware capabilities to support much larger node constellations.
- **Real-time Telemetry Integration:** Sync with live space-tracking APIs (e.g., Space-Track / Celestrak) for continuous live environment testing.
- **Dynamic Weather Interference:** Simulate space weather and atmospheric interference to test routing resilience.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!
Feel free to check the [issues page](https://github.com/yourusername/GDG-main/issues) if you want to contribute.

---

*cosmiQ: Bridging the gap between quantum science and satellite communications.*