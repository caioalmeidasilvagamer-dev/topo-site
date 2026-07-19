import { useRef, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * CameraRig
 *
 * Sets up a fixed isometric-style 3/4 view camera.
 * Uses PerspectiveCamera with a moderate FOV so the terrain reads as a
 * "game map" rather than an architectural render.
 *
 * Props:
 *  - target   {[x,y,z]}  Look-at point  (default: [0, 0, 0])
 *  - position {[x,y,z]}  Camera position (default: [14, 12, 14])
 *  - fov      {number}   Vertical FOV in degrees (default: 45)
 */
export default function CameraRig({
  target   = [0, 0, 0],
  position = [14, 12, 14],
  fov      = 45,
  children,
}) {
  const { camera, gl } = useThree()

  useEffect(() => {
    // Position & orientation
    camera.position.set(...position)
    camera.fov  = fov
    camera.near = 0.1
    camera.far  = 300
    camera.updateProjectionMatrix()

    // Look at the map centre (slightly below terrain mid-height)
    camera.lookAt(new THREE.Vector3(...target))
  }, [camera, position, fov, target])

  return <>{children}</>
}
