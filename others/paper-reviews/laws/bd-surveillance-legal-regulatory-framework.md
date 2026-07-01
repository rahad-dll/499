# Bangladesh Legal and Regulatory Framework for Surveillance Data

## Overview

Bangladesh does not have a single dedicated surveillance law. The legal environment for CCTV-based systems, AI-powered cameras, and data collected from public or semi-public spaces is governed by a combination of constitutional provisions, recently enacted data protection legislation, cyber security law, telecommunications regulation, and gaps in specific sector-level guidance. The framework is evolving rapidly, with the most significant development being the Personal Data Protection Ordinance of 2025, which introduces consent-based data governance for the first time.

## Constitutional Basis

Article 43 of the Constitution of Bangladesh guarantees citizens the right to privacy of correspondence and other means of communication. While this article does not explicitly address surveillance cameras or automated data collection in public spaces, it serves as the constitutional basis from which recent data protection legislation derives its authority. Courts and regulators cite Article 43 when defining the scope of lawful data collection.

## Personal Data Protection Ordinance, 2025 (PDPO)

The Personal Data Protection Ordinance, 2025 is the primary governing instrument for any system that collects, stores, processes, or transfers personal data in Bangladesh. It was gazetted in 2025 and full enforcement is expected to activate around May 2027.

Key provisions relevant to surveillance and AI vision systems:

**Consent requirement:** Every citizen is recognized as the rightful owner of their personal data. Explicit consent is mandatory before collecting, storing, transferring, or using any personal data. This applies to automated systems that capture identifiable information from individuals, including vehicle license plates and facial images captured by CCTV.

**Sensitive personal data:** The ordinance defines a category of sensitive personal data that includes biometric data, genetic information, health records, and data relating to ethnic or religious identity. Biometric data — which includes any data derived from physical characteristics used for identification — requires a higher standard of protection and stronger justification for processing.

**Data fiduciary obligations:** Any organization operating a system that collects personal data is classified as a data fiduciary. They are required to implement security measures, limit data collection to what is necessary for the stated purpose, and not retain data beyond the period needed for that purpose.

**Children's data:** The consent threshold is set at 18 years of age. Processing data related to individuals under 18 requires explicit parental or guardian consent.

**Extraterritoriality:** The ordinance applies to all data controllers and processors operating within Bangladesh and extends to foreign entities processing data of individuals located in Bangladesh.

**Enforcement timeline:** Full enforcement activates approximately May 2027. During the transitional period, organizations are expected to begin compliance work.

Source: [Prothom Alo, July 2025](https://en.prothomalo.com/bangladesh/government/teeopu4dfv); [Biometric Update, July 2025](https://www.biometricupdate.com/202511/bangladesh-strengthens-data-security-in-preparation-for-data-exchange-digital-id); [Article 19 analysis, May 2025](https://www.article19.org/resources/bangladesh-draft-data-protection-law-must-protect-freedom-of-expression/)

## Cyber Security Act, 2023 (CSA)

The Cyber Security Act 2023 replaced the Digital Security Act 2018 (DSA). It governs digital security, online conduct, and data security in electronic systems. While primarily focused on content and cybercrime rather than physical surveillance infrastructure, it is relevant to any AI system that processes data electronically.

The CSA retains provisions that allow law enforcement to access electronic data under certain circumstances. Critics including Amnesty International and Human Rights Watch have noted that several provisions of the DSA carried over into the CSA without substantive reform, including broad powers around seizure of electronic devices and data without warrant in some circumstances.

For a parking management system that stores vehicle entry and exit records, license plate images, and timestamps in a digital database, the CSA creates an environment where law enforcement may seek access to that stored data. There is no clear procedural requirement for a judicial warrant in all circumstances under the current law.

Source: [ICNL analysis, 2024](https://www.icnl.org/post/analysis/bangladeshs-cyber-security-act); [Amnesty International, August 2024](https://www.amnesty.org/en/latest/news/2024/08/bangladesh-interim-government-must-restore-freedom-of-expression-in-bangladesh-and-repeal-cyber-security-act/)

## Bangladesh Telecommunications Regulation Act (BTRA) and Amendment 2006

Section 97(Ka) of the Bangladesh Telecommunications Regulation Act, as introduced by the Bangladesh Telecommunications Amendment Act 2006, is the primary statutory basis for government surveillance powers over communications networks. It grants government authorities the power to intercept or monitor electronic communications under national security or law enforcement grounds.

This provision is less directly relevant to a parking management system but becomes relevant if the system is connected to a network infrastructure or if its data feeds are accessed by government-operated traffic management systems.

Source: [Global Network Initiative Country Report, Bangladesh](https://clfr.globalnetworkinitiative.org/country/bangladesh/)

## Telecommunications Act, 2001

Section 71 of the Telecommunications Act 2001 makes intentional interception of private communications a criminal offense carrying up to two years imprisonment or a fine up to five crore taka. This establishes Bangladesh as an all-party consent jurisdiction for communications interception. While this applies more directly to voice and data communications than to CCTV footage, it establishes the general principle that unauthorized interception of private information is criminally liable.

Source: [Recording Law, Bangladesh Recording Laws](https://www.recordinglaw.com/bangladesh-recording-laws/)

## CCTV Deployment in Practice

Bangladesh has deployed CCTV and AI-powered camera systems in public spaces without a specific regulatory framework governing their operation. As of May 2025, AI cameras have been installed at 23 major junctions in Dhaka to automatically detect traffic violations including red light running, illegal parking, and mobile phone use while driving.

These deployments are government-operated and function under police authority rather than under a dedicated surveillance law. There is no publicly available regulatory document specifying the data retention period for footage, the access control procedures, the oversight mechanism, or the complaint process for individuals whose data is captured.

Private CCTV systems in parking lots, apartments, and commercial buildings operate in a similar regulatory vacuum. There are no sector-specific rules governing private parking lot surveillance, data retention, or the use of automated license plate recognition by private operators.

Source: [Dhaka Tribune, May 2025](https://www.dhakatribune.com/bangladesh/dhaka/412939/ai-cameras-catch-violators-police-eye-fugitives)

## Gaps in the Current Framework

Several areas remain unregulated as of mid-2026:

There is no dedicated CCTV regulation or surveillance camera code of practice equivalent to those in the UK, EU, or Singapore. Private operators are not required to register their surveillance systems, post notices in surveilled areas, or publish data retention policies.

No sector-specific guidance exists for AI-powered parking management systems. The PDPO 2025 will cover such systems once fully enforced in 2027, but no interim guidance from the government has been issued.

License plate recognition is treated as ordinary data collection under the PDPO framework. There is no specific license plate recognition law. However, since vehicle registration numbers can be linked to vehicle owner identities through BRTA records, license plate data captured by a private system may qualify as personal data under the PDPO definition.

The PDPO does not explicitly address the use of AI for automated decision-making based on surveillance data, such as automated billing based on license plate matching. This gap will need to be addressed either through secondary regulations or through a future amendment.

## Implications for a Parking Management System

A camera-based parking management system that captures license plate images, records entry and exit times, and links that data to billing records would be subject to the following requirements once the PDPO is fully enforced:

Posting visible notice at parking lot entrances informing drivers that CCTV and license plate recognition are in use and stating the purpose of data collection.

Limiting data retention to the minimum period necessary for billing and dispute resolution. Extended retention for analytics or traffic modeling would require separate justification and potentially separate consent.

Implementing reasonable technical security measures to protect the stored data from unauthorized access.

Not sharing vehicle entry and exit records or license plate images with third parties without driver consent, except when required by law enforcement with appropriate legal authority.

For research purposes during development, using existing public datasets such as PKLot and CNRPark rather than collecting footage from real Bangladeshi parking lots reduces regulatory exposure during the pre-deployment phase.

## Summary Timeline of Key Legislation

| Year | Instrument | Status |
|------|-----------|--------|
| 2001 | Telecommunications Act | Active |
| 2006 | BTRA Amendment (Section 97Ka) | Active |
| 2018 | Digital Security Act | Replaced |
| 2023 | Cyber Security Act | Active |
| 2025 | Personal Data Protection Ordinance | Active, enforcement from ~May 2027 |
| 2025 | National Data Governance Ordinance | Active |

## Sources

- Prothom Alo — https://en.prothomalo.com/bangladesh/government/teeopu4dfv
- Article 19 — https://www.article19.org/resources/bangladesh-draft-data-protection-law-must-protect-freedom-of-expression/
- Biometric Update — https://www.biometricupdate.com/202511/bangladesh-strengthens-data-security-in-preparation-for-data-exchange-digital-id
- ICNL — https://www.icnl.org/post/analysis/bangladeshs-cyber-security-act
- Amnesty International — https://www.amnesty.org/en/latest/news/2024/08/bangladesh-interim-government-must-restore-freedom-of-expression-in-bangladesh-and-repeal-cyber-security-act/
- Global Network Initiative — https://clfr.globalnetworkinitiative.org/country/bangladesh/
- Recording Law — https://www.recordinglaw.com/bangladesh-recording-laws/
- Dhaka Tribune — https://www.dhakatribune.com/bangladesh/dhaka/412939/ai-cameras-catch-violators-police-eye-fugitives
- Atlantic Council — https://www.atlanticcouncil.org/in-depth-research-reports/issue-brief/bangladesh-draft-data-protection-act-2023-potential-and-pitfalls/

## Bottom Line

As of mid-2026 there is no specific law that restricts operating a CCTV-based parking management system with license plate recognition in Bangladesh. No registration is required, no mandatory signage exists, and no retention limits are enforced. The government itself runs AI cameras on Dhaka roads under the same legal vacuum.

The one thing that changes this is the Personal Data Protection Ordinance 2025, which comes into full enforcement around May 2027. At that point, license plate data qualifies as personal data because it can be linked to a vehicle owner through BRTA records. The practical requirements that follow are not burdensome: post a visible notice at the parking lot entrance stating that cameras and license plate recognition are in use, do not keep vehicle records longer than needed for billing and dispute resolution, and do not share that data with third parties without consent.

During development and testing, using public datasets such as PKLot and CNRPark avoids collecting real personal data entirely, which eliminates regulatory exposure in that phase. For a live deployment before May 2027, document what data is collected and why. For anything going live after May 2027, add the entrance notice and set a written data retention policy. That is the full compliance requirement under the current legal trajectory.
