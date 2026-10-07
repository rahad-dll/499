# Towards Intelligent Traffic Signaling in Dhaka City Based on Vehicle Detection and Congestion Optimization

## Citation and Metadata

- Full title: Towards Intelligent Traffic Signaling in Dhaka City Based on Vehicle Detection and Congestion Optimization
- Authors: Kazi Ababil Azam, Hasan Masum, Masfiqur Rahaman, A. B. M. Alim Al Islam
- Year: 2025 (October)
- Institution: Bangladesh University of Engineering and Technology (BUET)
- ArXiv ID: 2510.16622v1
- Link: https://arxiv.org/abs/2510.16622

## Summary

This paper tackles traffic signal optimization in Dhaka using real-time vehicle detection and a multi-objective optimization algorithm. Its core contribution is that it does not assume lane-based traffic behavior and instead builds the system around the mixed, non-lane-based reality of Dhaka's intersections. The detection component runs on a Raspberry Pi 4B, and the field evaluation is conducted at Palashi Intersection, a real five-road junction in Dhaka. This combination of local realism and low-cost hardware makes the paper a useful reference for distributed urban sensing systems.

## Problem and Motivation

Dhaka's intersections operate under conditions that most traffic control research does not model well. Vehicles do not follow clear lanes. The mix of motorized traffic including cars, buses, and rickshaws alongside non-motorized traffic including bicycles means that standard lane-counting approaches fail to capture actual congestion. Manual police control at major intersections is the current practice, but it is expensive, inconsistent, and does not scale. The paper proposes an automated system that reads actual vehicle density from camera feeds and adjusts signal timing accordingly.

## Methodology

The system pipeline runs from camera input through detection to optimization and signal output.

Multi-threaded frame extraction pulls frames from RTSP camera feeds. This is necessary because a single-threaded approach cannot keep up with continuous video at a busy intersection.

Vehicle detection uses a YOLO-based model trained on the NHT-1071 dataset. That dataset contains 1,071 images with roughly 30,000 labeled objects across four classes: motorized, non-motorized, mixed, and other. The choice to use a dataset built for non-lane-based heterogeneous traffic is deliberate and important because it matches the actual conditions at the deployment site.

Vehicle counts are split into motorized in and out counts and non-motorized in and out counts per approach road. This separation matters because non-motorized vehicles move differently and should not be weighted the same as cars in the optimization.

The optimization component uses NSGA-II, a multi-objective evolutionary algorithm. The two objective functions are minimizing total congestion across all lanes and minimizing red-signal waiting time. These two objectives are in tension: reducing waiting time for one approach can increase congestion on another. NSGA-II finds a Pareto-optimal set of signal timings that balances both goals simultaneously.

The hardware is a Raspberry Pi 4B with 4 GB of RAM. This is the actual deployment hardware, not a simulation environment.

The field test site is Palashi Intersection in Dhaka, a five-road junction. The evaluation compares AI-optimized signal timing against manual police-controlled signals.

## Key Results

The system demonstrates that adaptive signal timing based on real-time detection outperforms static schedules in a non-lane-based traffic environment. The multi-threaded frame extraction provides stable processing across multiple simultaneous camera feeds. The Raspberry Pi 4B handles real-time detection at a medium-sized intersection without requiring dedicated server hardware.

The paper also confirms a practical insight: in non-lane-based traffic, the system must continuously re-count vehicles rather than using lane occupancy estimates. Traffic density changes faster and less predictably than in structured lane-based settings.

## Strengths

The paper's strongest quality is its grounding in the actual traffic conditions it aims to improve. Using the NHT-1071 dataset, deploying at a real Dhaka intersection, and running on a Raspberry Pi rather than a lab server all increase the credibility of the results.

The NSGA-II optimization framework is generic enough to be repurposed. Any system that needs to balance two competing objectives across multiple spatial units can adapt this approach. For parking management, the same framework applies to balancing slot utilization and minimizing driver search time across multiple lots.

The edge deployment on Raspberry Pi is directly relevant to any distributed architecture where compute is placed at the point of data collection rather than centralized in a cloud server.

## Limitations

The evaluation focuses on a single intersection. It is not clear how well the approach generalizes to other Dhaka locations with different road layouts, different traffic mixes, or different peak hours. The dataset of 1,071 images is moderate in size and may not cover seasonal variation or night-time conditions adequately.

The paper does not specify how long the optimization step takes per cycle, which leaves open the question of how quickly the system responds to sudden traffic changes. If the NSGA-II computation takes several seconds, the signal timing update may lag behind fast-changing conditions.

Non-motorized vehicle classification, specifically distinguishing rickshaws from bicycles, is noted as a remaining challenge. Misclassification here affects the optimization weights and could produce suboptimal signal timings.

There is no comparison with an existing automated traffic system because no such system operates in Dhaka. The baseline is manual police control, which is not a rigorous engineering baseline.

RTSP camera infrastructure is required. Parking lots or intersections without IP-connected cameras cannot use this system without hardware investment.

