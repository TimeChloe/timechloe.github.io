---
title: "Semester Project: Learning Motion in Manipulation Tasks from Demonstration"
excerpt: |
  <div style="display: flex; align-items: center; gap: 1rem;">
    <div style="flex: 1;">
        I implemented two teleoperation systems (VR to Robots and Sigma.7 to Robots) and introduced a object recognition system, which combines 2D segmentation with depth information for accurate object position estimation. Additionally, vision-based tactile sensors are employed to enhance the robot’s capabilities in contact-rich tasks.
    </div>
    <div style="flex: 1;">
      <img src="/images/tele_fig_setup.png" 
           alt="some image" 
           style="width: 60%; height: auto; max-width: 400px;" />
    </div>
  </div>
collection: portfolio
---

## Implementation

### 1. Virtual Reality Based Robot Teleoperation
This section presents a virtual reality (VR)-based teleoperation system for controlling two Franka Emika Panda robots. The system utilizes an [HTC Vive Pro Kit](https://www.vive.com/us/) as the VR hardware, interfaced with Robot Operating System (ROS). The setup enables intuitive real-time control and demonstration of robotic manipulation tasks.

- **VR Interface:** Use HTC Vive controllers to track hand movements.
- **Control System:** The controller data is mapped to robot end-effectors through SteamVR and OpenVR.
- **Safety Features:** Includes workspace boundary checking and impedance control for safe interactions.

### 2. Haptic Feedback Teleoperation
To enhance control accuracy and user experience, a haptic device [sigma.7](https://www.forcedimension.com/products/sigma) was introduced for bilateral teleoperation. Key components include:

- **Haptic Feedback:** Provides real-time force feedback using a Bota Systems SensOne 6D force-torque sensor.
- **Velocity Control:** Implements relative velocity scaling to map operator movements to the robot end-effector.
- **Clutch Mechanism:** A foot pedal mechanism enables smooth transitions between tasks.

### 3. Object Pose Estimation using Vision-Based Methods
An object recognition system was developed using [Grounded-SAM](https://github.com/IDEA-Research/Grounded-Segment-Anything), combining 2D segmentation and depth information. The steps include:

- **Object Segmentation:** Uses Grounding DINO for object detection with text prompts.
- **Depth Processing:** Intel RealSense D435 captures depth information for precise pose estimation.
- **Data Filtering:** Implements noise reduction using PCA and statistical outlier removal.

### 4. Vision-Based Tactile Sensing
To improve performance in contact-rich tasks, the [GelSight Mini](https://www.gelsight.com/gelsightmini/) sensor was employed for high-resolution tactile sensing. This enables the robot to measure:

- Contact forces and object surface geometry
- Texture recognition for precise grasping

## Semester Project Report

Below, you can view the Semester Project Report directly or download it for local viewing:

<iframe src="https://1drv.ms/b/c/174cfd4941e40667/IQTLrrMWhnF2TZ6p8tIug8kwAbDpK3bW3BXCl2OZJsNyiV8"   width="90%" 
  height="540"  frameborder="0" scrolling="no"></iframe>

[**Download the Semester Project Report**](https://onedrive.live.com/?cid=174CFD4941E40667&id=174CFD4941E40667%21s16b3aecb71864d769ea9f2d22e83c930&parId=174CFD4941E40667%21s5158bba5d43b4d07a7f8409e2062ac41&o=OneUp)
