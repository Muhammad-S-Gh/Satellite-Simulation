import { EARTH_RADIUS_M } from './index';
import * as THREE from 'three';

export function computeBenchmarks(params) {
    const { G, M, R } = params;
    params.perfectV = Math.sqrt((G * M) / R);
    params.escapeV = Math.sqrt((2 * G * M) / R);
    params.accel = (G * M) / (R * R);

    const currentRadius = params.physPos.length();
    params.R_Km = currentRadius / 1e3;

    params.Altitude = Math.max(0, (currentRadius - EARTH_RADIUS_M) / 1e3);
}

export let ellipse = {};
function solveKepler(M, e, tol = 1e-8, maxIterations = 100) {
    let E = M;
    if (e > 0.8) {
        E = Math.PI;
    }

    let iteration = 0;
    let delta = 1;

    while (Math.abs(delta) > tol && iteration < maxIterations) {
        delta = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
        E -= delta;
        iteration++;
    }
    return E;
}

export function updateCircular(params, satMesh, dt) {
    const v = params.perfectV;
    const R = params.R;

    if (satMesh.userData.theta == null) {
        satMesh.userData.theta = 0;
    }
    const ω = v / R;
    satMesh.userData.theta += ω * dt;

    const x = R * Math.cos(satMesh.userData.theta);
    const z = R * Math.sin(satMesh.userData.theta);

    params.physPos.set(x, 0, z);
}

export function updateElliptical(params, satMesh, dt) {
    const mu = params.G * params.M;
    const r0 = params.physPos.clone();
    const speed0 = params.v;

    if (!ellipse.initialized || ellipse.lastSpeed !== speed0 || ellipse.lastMu !== mu) {
        ellipse = {};
        ellipse.lastSpeed = speed0;
        ellipse.lastMu = mu;

        let eps = (speed0 * speed0) / 2 - mu / r0.length();
        const TOL = 1e-6;
        if (eps >= -TOL) eps = -TOL;

        ellipse.a = -mu / (2 * eps);

        const radialUnit = r0.clone().normalize();
        const tangentialVec = new THREE.Vector3(-radialUnit.z, 0, radialUnit.x).multiplyScalar(speed0);
        const hVec = r0.clone().cross(tangentialVec);

        const hMag = hVec.length();
        ellipse.e = Math.sqrt(1 + (2 * eps * hMag * hMag) / (mu * mu));
        ellipse.b = ellipse.a * Math.sqrt(1 - ellipse.e * ellipse.e);
        ellipse.n = Math.sqrt(mu / Math.pow(ellipse.a, 3));

        const r = r0.length();
        const v_sq = speed0 * speed0;
        const e_vec = r0
            .clone()
            .multiplyScalar(v_sq - mu / r)
            .sub(tangentialVec.clone().multiplyScalar(r0.dot(tangentialVec)))
            .divideScalar(mu);

        if (ellipse.e < 1e-6) {
            ellipse.P = radialUnit;
            ellipse.Q = tangentialVec.clone().normalize();
        } else {
            ellipse.P = e_vec.normalize();
            ellipse.Q = hVec.clone().normalize().cross(ellipse.P).normalize();
        }

        const cosφ = ellipse.P.dot(radialUnit);
        const sinφ = ellipse.Q.dot(radialUnit);
        const φ = Math.atan2(sinφ, cosφ);

        const cosE = (ellipse.e + cosφ) / (1 + ellipse.e * cosφ);
        const sinE = (Math.sqrt(1 - ellipse.e * ellipse.e) * sinφ) / (1 + ellipse.e * cosφ);
        const E0 = Math.atan2(sinE, cosE);

        ellipse.M = E0 - ellipse.e * Math.sin(E0);
        ellipse.initialized = true;
    }

    ellipse.M += ellipse.n * dt;
    const E = solveKepler(ellipse.M, ellipse.e, 1e-8, 100);

    const xOrb = ellipse.a * (Math.cos(E) - ellipse.e);
    const yOrb = ellipse.b * Math.sin(E);
    const rVec = ellipse.P.clone().multiplyScalar(xOrb).add(ellipse.Q.clone().multiplyScalar(yOrb));

    params.physPos.copy(rVec);
    params.vCurrent = Math.sqrt(mu * (2 / rVec.length() - 1 / ellipse.a));
}

export function fallToGround(params, satMesh, dt) {
    const mu = params.G * params.M;
    const R_earth = EARTH_RADIUS_M;

    if (!satMesh.userData.fallState) {
        satMesh.userData.radius = params.physPos.length();
        satMesh.userData.vRadial = 0;
        satMesh.userData.vTangential = params.v;
        satMesh.userData.theta = Math.atan2(params.physPos.z, params.physPos.x);
        satMesh.userData.fallState = true;
        satMesh.userData.crashed = false;
        satMesh.userData.periapsis = Infinity;
    }

    let r = satMesh.userData.radius;
    let vRad = satMesh.userData.vRadial;
    let vTang = satMesh.userData.vTangential;
    let theta = satMesh.userData.theta;

    const MAX_STEPS = 10;
    let remainingDt = dt;
    let steps = 0;

    while (remainingDt > 0 && steps < MAX_STEPS && !satMesh.userData.crashed) {
        steps++;
        let subDt = remainingDt;

        const altitude = r - R_earth;
        if (altitude < 1000e3) {
            subDt = Math.min(remainingDt, 0.1);
        }
        if (altitude < 100e3) {
            subDt = Math.min(remainingDt, 0.01);
        }

        const vTotal = Math.sqrt(vRad * vRad + vTang * vTang);

        const g = mu / (r * r);
        const aRad = -g;

        let dragAccel = 0;
        if (altitude < 100e3) {
            const density = 1.225 * Math.exp(-altitude / 8e3);
            const dragCoeff = 2.2;
            const crossSection = 1;
            const mass = 100;
            dragAccel = (-0.5 * density * vTotal * vTotal * dragCoeff * crossSection) / mass;
        }

        vRad += (aRad + dragAccel * (vRad / vTotal)) * subDt;

        vTang += dragAccel * (vTang / vTotal) * subDt;

        const newR = r + vRad * subDt;

        if (newR <= R_earth) {
            r = R_earth;
            vRad = 0;
            vTang = 0;
            satMesh.userData.crashed = true;
        } else {
            r = newR;

            if (r < satMesh.userData.periapsis) {
                satMesh.userData.periapsis = r;
            }

            const omega = vTang / r;
            theta += omega * subDt;
        }

        remainingDt -= subDt;
    }

    params.physPos.set(r * Math.cos(theta), 0, r * Math.sin(theta));

    satMesh.userData.radius = r;
    satMesh.userData.vRadial = vRad;
    satMesh.userData.vTangential = vTang;
    satMesh.userData.theta = theta;
}

export function updateHyperbolic(params, satMesh, dt) {
    const mu = params.G * params.M;
    const r0 = params.physPos.clone();
    const speed0 = params.v;

    if (!satMesh.userData.hyperbola) {
        satMesh.userData.hyperbola = {};
    }
    const hyperbola = satMesh.userData.hyperbola;

    if (!hyperbola.initialized || hyperbola.lastSpeed !== speed0 || hyperbola.lastMu !== mu) {
        hyperbola.initialized = true;
        hyperbola.lastSpeed = speed0;
        hyperbola.lastMu = mu;

        const eps = (speed0 * speed0) / 2 - mu / r0.length();

        hyperbola.a = -mu / (2 * eps);

        const radialUnit = r0.clone().normalize();
        const tangentialVec = new THREE.Vector3(-radialUnit.z, 0, radialUnit.x).multiplyScalar(speed0);
        const hVec = r0.clone().cross(tangentialVec);
        const hMag = hVec.length();

        hyperbola.e = Math.sqrt(1 + (2 * eps * hMag * hMag) / (mu * mu));

        hyperbola.b = Math.abs(hyperbola.a) * Math.sqrt(hyperbola.e * hyperbola.e - 1);

        hyperbola.n = Math.sqrt(mu / Math.pow(-hyperbola.a, 3));

        const r = r0.length();
        const v_sq = speed0 * speed0;
        const e_vec = r0
            .clone()
            .multiplyScalar(v_sq - mu / r)
            .sub(tangentialVec.clone().multiplyScalar(r0.dot(tangentialVec)))
            .divideScalar(mu);

        hyperbola.P = e_vec.normalize();
        hyperbola.Q = hVec.clone().normalize().cross(hyperbola.P).normalize();

        const cosφ = hyperbola.P.dot(radialUnit);
        const sinφ = hyperbola.Q.dot(radialUnit);
        const φ = Math.atan2(sinφ, cosφ);

        const sinH = (Math.sqrt(hyperbola.e * hyperbola.e - 1) * sinφ) / (1 + hyperbola.e * cosφ);
        const cosH = (hyperbola.e + cosφ) / (1 + hyperbola.e * cosφ);
        const H0 = Math.atanh(sinH / cosH);

        hyperbola.M = hyperbola.e * Math.sinh(H0) - H0;
    }

    hyperbola.M += hyperbola.n * dt;

    const H = solveHyperbolicKepler(hyperbola.M, hyperbola.e);

    const xOrb = -hyperbola.a * (hyperbola.e - Math.cosh(H));
    const yOrb = -hyperbola.a * Math.sqrt(hyperbola.e * hyperbola.e - 1) * Math.sinh(H);
    const rVec = hyperbola.P.clone().multiplyScalar(xOrb).add(hyperbola.Q.clone().multiplyScalar(yOrb));

    params.physPos.copy(rVec);
    params.vCurrent = Math.sqrt(mu * (2 / rVec.length() + 1 / Math.abs(hyperbola.a)));
}

function solveHyperbolicKepler(M, e, tol = 1e-8, maxIterations = 50) {
    let H = M;
    if (e > 1.0 && Math.abs(M) > 1.0) {
        H = M < 0 ? -Math.log((-2 * M) / e) : Math.log((2 * M) / e);
    }

    let iteration = 0;
    let delta = 1;

    while (Math.abs(delta) > tol && iteration < maxIterations) {
        const sinhH = Math.sinh(H);
        const coshH = Math.cosh(H);
        const f = e * sinhH - H - M;
        const f1 = e * coshH - 1;
        delta = f / f1;
        H -= delta;
        iteration++;
    }
    return H;
}
