# 🛰️ Satellite Simulation

An interactive 3D satellite orbit simulation built with **Three.js**, **JavaScript**, and real-time orbital mechanics.

The simulation visualizes how a satellite behaves at different initial velocities around Earth, including **circular orbits, elliptical orbits, atmospheric fall/collision, and escape trajectories**. A real-time control panel allows you to experiment with physical parameters such as orbital radius, mass, gravitational constant, and velocity.

## ✨ Features

* 🌍 Realistic 3D Earth with surface, clouds, atmosphere, and night lights
* 🌙 3D Moon with surface and bump textures
* 🛰️ 3D satellite model
* ⭐ Procedurally generated star field
* 🎛️ Interactive GUI controls using `dat.gui`
* ⚛️ Real-time orbital mechanics
* 🔵 Circular orbits
* 🟢 Elliptical orbits
* 🔻 Falling and ground-impact simulation
* 🚀 Escape / hyperbolic trajectories
* 📐 Real-time orbital calculations
* 📊 Live altitude, orbital radius, velocity, escape velocity, and acceleration values
* 🖥️ Webpack development server and production build configuration

## 🧠 How the Simulation Works

The simulation uses classical Newtonian orbital mechanics to determine the satellite's trajectory from its distance and velocity.

For a given gravitational parameter:

```text
μ = G × M
```

the circular orbital velocity is calculated as:

```text
v₀ = √(GM / R)
```

and escape velocity as:

```text
vₑ = √(2GM / R)
```

The satellite's behavior is then determined by its velocity relative to these two values.

### Circular Orbit

When:

```text
v = v₀
```

the satellite follows a circular orbit around Earth.

### Elliptical Orbit

When:

```text
v₀ < v < vₑ
```

the satellite follows an elliptical trajectory.

The simulation solves **Kepler's equation** numerically to update the satellite's position along the ellipse.

### Falling / Collision

When:

```text
v < v₀
```

the satellite loses enough tangential velocity to fall toward Earth.

The simulation also introduces a simplified atmospheric drag model at low altitude and detects when the satellite reaches Earth's surface.

### Escape Trajectory

When:

```text
v ≥ vₑ
```

the satellite enters a hyperbolic escape trajectory.

The hyperbolic form of Kepler's equation is solved numerically to update the satellite's position.

## 🎮 Controls

The simulation provides an interactive control panel with parameters including:

| Parameter       | Description                                       |
| --------------- | ------------------------------------------------- |
| `Radius R [m]`  | Distance between the satellite and Earth's center |
| `Mass M [kg]`   | Mass of the central body                          |
| `G [m³/kg·s²]`  | Gravitational constant                            |
| `v [m/s]`       | Satellite velocity                                |
| `Altitude [km]` | Current satellite altitude                        |
| `R [km]`        | Current orbital radius                            |
| `v₀ (circ)`     | Circular orbital velocity                         |
| `vₑ (escape)`   | Escape velocity                                   |
| `a [m/s²]`      | Gravitational acceleration                        |
| `v [current]`   | Current satellite velocity                        |

Changing the main physical parameters automatically recalculates the orbital benchmarks and resets the satellite's starting position.

## 🛠️ Tech Stack

* **JavaScript (ES Modules)**
* **Three.js** — 3D rendering and scene management
* **dat.GUI** — interactive simulation controls
* **mathjs** — mathematical utilities
* **GSAP** — animation utilities
* **Webpack** — bundling and development server
* **Babel** — JavaScript transpilation
* **GLTF / GLB** — 3D model assets

## 📁 Project Structure

```text
Satellite-Simulation/
├── bundler/
│   ├── webpack.common.js
│   ├── webpack.dev.js
│   └── webpack.prod.js
│
├── envs/
│   └── environment / scene assets
│
├── src/
│   ├── assets/
│   │   └── models/
│   │       ├── earth.glb
│   │       ├── realistic_earth_8k.glb
│   │       ├── satellite.glb
│   │       └── the_moon.glb
│   │
│   ├── textures/
│   │   ├── Earth textures
│   │   ├── Moon textures
│   │   └── star-field utilities
│   │
│   ├── index.js
│   ├── physics.js
│   ├── index.html
│   └── style.css
│
├── .babelrc
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

## 🚀 Getting Started

### Prerequisites

Make sure you have installed:

* [Node.js](https://nodejs.org/)
* npm

### Installation

Clone the repository:

```bash
git clone https://github.com/Muhammad-S-Gh/Satellite-Simulation.git
```

Move into the project directory:

```bash
cd Satellite-Simulation
```

Install dependencies:

```bash
npm install
```

### Run the Development Server

Start the Webpack development server:

```bash
npm run dev
```

The development configuration runs the server on:

```text
http://localhost:8080
```

Open that address in your browser.

### Production Build

Create a production bundle with:

```bash
npm run build
```

The generated production files are placed in:

```text
dist/
```

## 🔬 Physics Implementation

The physics engine is separated into its own module:

```text
src/physics.js
```

It contains dedicated logic for:

* Circular orbital motion
* Elliptical orbital motion
* Hyperbolic escape trajectories
* Falling and collision behavior
* Circular and escape velocity calculations
* Gravitational acceleration
* Kepler equation solvers
* Simplified atmospheric drag

This separation keeps the simulation's rendering logic independent from the orbital calculations.

## 🌌 Rendering

The Three.js scene includes:

* Earth surface texture
* Specular mapping
* Bump mapping
* Cloud layer
* Atmospheric Fresnel glow
* Night-side city lights
* Moon
* Satellite
* Directional sunlight
* Star field
* Orbit visualization

The satellite model is loaded using Three.js's `GLTFLoader`, while Earth and Moon surfaces are constructed and textured directly in the scene.

## 📷 Screenshots

Add screenshots or a short GIF here to make the repository easier to understand at a glance.

For example:

```md
![Satellite Simulation](docs/screenshots/simulation.png)
```

A short gameplay/demo GIF would be especially useful for this project.

## ⚠️ Notes

This project is intended as a **visual and educational orbital mechanics simulation**, not as a high-fidelity spacecraft flight dynamics simulator.

Some physical values and models are intentionally simplified for real-time visualization, including the atmospheric drag model and certain Earth-related approximations.

## 📚 What I Learned

This project was built to explore the combination of:

* 3D graphics with Three.js
* Orbital mechanics
* Newtonian gravity
* Kepler's equations
* Numerical solving
* Real-time simulation
* WebGL rendering
* 3D model and texture management
* Webpack-based JavaScript applications

---

⭐ If you find the project interesting, consider starring the repository.
