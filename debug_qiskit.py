
import qiskit
from qiskit import primitives
try:
    from qiskit.primitives import Sampler
    print(f"V1 Sampler found: {Sampler}")
except ImportError:
    print("V1 Sampler NOT found")

try:
    from qiskit.primitives import StatevectorSampler
    print(f"V2 StatevectorSampler found: {StatevectorSampler}")
except ImportError:
    print("V2 StatevectorSampler NOT found")

try:
    import qiskit_aer
    from qiskit_aer.primitives import Sampler as AerSampler
    print(f"Aer Sampler found: {AerSampler}")
except ImportError:
    print("Aer NOT found")

import qiskit_algorithms
print(f"qiskit-algorithms version: {qiskit_algorithms.__version__}")
print(f"qiskit version: {qiskit.__version__}")
