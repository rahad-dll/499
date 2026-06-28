# DNCC Smart Parking App (Gulshan Deployment)

## Citation and Metadata

- Application name: DNCC Smart Parking (official name: Smart on Street Parking)
- Organization: Dhaka North City Corporation (DNCC)
- Launch date: November 2023
- Status: Production pilot deployment
- Reference: Press Xpress article
- Link: https://pressxpress.org/2023/11/09/smart-parking-dncc-debuts-app-in-gulshan/

## Summary

This source documents a real parking digitization initiative deployed by Dhaka North City Corporation in Gulshan. It is not an academic paper, but it is essential reading because it provides the only documented example of a production parking management system operating in Dhaka. The system covers 202 on-street parking spots across eight roads in Gulshan, supports real-time availability display, advance reservation, and digital payment via bKash and Nagad. Its value is not technical novelty but rather market validation: Dhaka drivers are already using app-based parking services, and the municipal authority has demonstrated willingness to deploy and maintain such a system.

## Problem and Motivation

Dense urban areas like Gulshan generate significant time loss and traffic congestion as drivers circle looking for available parking. Before the DNCC app, parking in Gulshan depended on manual booth operators who tracked occupancy without any digital interface for the driver. The system is designed to remove that information gap, reduce unnecessary circling, and introduce structured payment collection.

## System Deployment

Phase 1 covers 202 parking spots across eight key roads in the Gulshan area including Gulshan-2, Gulshan Avenue, and Park Road. The mix includes on-street spaces and official parking zones.

Operational hours are 8:00 AM to 10:00 PM on working days. Parking is free between 10:00 PM and 8:00 AM and free all day on Fridays and national holidays.

The client layer includes iOS and Android applications and a web portal. The backend handles real-time space monitoring, an online payment gateway, reservation management, and integration with DNCC's municipal services platform.

Expansion to the full North City area is planned in subsequent phases, though the timeline has not been officially confirmed.

## Pricing Structure

| Vehicle Type | First 2 Hours | Third Hour | Fourth Hour Onward | Night and Holidays |
|--------------|--------------|------------|-------------------|-------------------|
| Private car, jeep, microbus | Tk 50 | Tk 50 | Tk 100 per hour | Free |
| Motorcycle | Tk 15 | Tk 15 | Tk 30 per hour | Free |

Payment is accepted via bKash, Nagad, and credit or debit card through the DNCC online portal.

## Core Features

Real-time availability shows live occupancy status so drivers know which spots are open before arriving. Advance reservation allows drivers to book a slot up to 12 hours ahead. Online payment handles the full transaction through the app. Complaint reporting integrates with the broader Dhaka app and achieves a 98 percent resolution rate. The system is available on iOS, Android, and web simultaneously.

## Operational Metrics

As of November 2023 the system actively manages 202 parking spaces. The complaint resolution rate through the Dhaka app integration stands at 98 percent. Payment success rate and user adoption figures have not been officially disclosed.

## Strengths

The DNCC system is a live production deployment, not a prototype. That matters because it proves user adoption of app-based parking in Dhaka under real conditions. The government authority backing it through DNCC gives it legitimacy and removes some of the friction that purely private services face when operating on public roads.

The 98 percent complaint resolution rate through the Dhaka app integration is evidence that the operational support model works at this scale. The phased rollout from Gulshan to North City is a replicable expansion strategy.

## Limitations

The DNCC system depends entirely on human booth operators to detect space occupancy. There is no computer vision component. This means the real-time availability data is only as accurate and timely as the operator inputs it, which introduces latency, human error, and high operational staffing costs.

The system has no license plate recognition. Entry and exit cannot be automated, so billing depends on manual time tracking rather than vehicle identification.

Static pricing means the system cannot respond to demand peaks. High-demand periods like weekend evenings in Gulshan generate the same rate as low-demand mornings, which is economically inefficient and does not discourage congestion.

Geographic scope is limited to 202 spots in a single upscale neighborhood. This does not represent the scale or diversity of a city-wide system. Extending the same manual approach to thousands of spots across Dhaka would require proportionally more booth operators, which is not economically viable.

