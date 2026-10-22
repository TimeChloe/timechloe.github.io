---
title: "LEMMo-Plan: LLM-Enhanced Learning from Multi-Modal Demonstration for Planning Sequential Contact-Rich Manipulation Tasks"
collection: publications
category: conferences
permalink: /publication/2025-icra-lemmo-plan
redirect_from:
  - /publication/ICRA2025
date: 2025-05-19
venue: '2025 IEEE International Conference on Robotics and Automation (ICRA 2025)'
authors: 'Kejia Chen, Zheng Shen, <b>Yue Zhang</b>, Lingyun Chen, Fan Wu, Zhenshan Bing, Sami Haddadin, Alois Knoll'
paperurl: 'https://ieeexplore.ieee.org/document/11127842'
arxivurl: 'https://arxiv.org/abs/2409.11863'
projecturl: 'https://lemmo-plan.github.io/LEMMo-Plan/'
---

Large Language Models (LLMs) have gained popularity in task planning for long-horizon manipulation tasks. To enhance the validity of LLM-generated plans, visual demonstrations and online videos have been widely employed to guide the planning process. However, for manipulation tasks involving subtle movements but rich contact interactions, visual perception alone may be insufficient for the LLM to fully interpret the demonstration. Additionally, visual data provides limited information on force-related parameters and conditions, which are crucial for effective execution on real robots. In this paper, we introduce an in-context learning framework that incorporates tactile and force-torque information from human demonstrations to enhance LLMs' ability to generate plans for new task scenarios. We propose a bootstrapped reasoning pipeline that sequentially integrates each modality into a comprehensive task plan. This task plan is then used as a reference for planning in new task configurations. Real-world experiments on two different sequential manipulation tasks demonstrate the effectiveness of our framework in improving LLMs' understanding of multi-modal demonstrations and enhancing the overall planning performance.
