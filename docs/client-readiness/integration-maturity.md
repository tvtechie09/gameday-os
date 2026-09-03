# Integration Maturity Matrix

Use these labels in every demo, proposal, and implementation conversation.

| Capability | Status | What may be promised |
|---|---|---|
| CSV schedule import | Live and verified in code | Customer exports a file, previews mappings/conflicts, and applies approved changes. |
| iCal/public calendar feed | Live and verified in code | Credential-free HTTPS feeds can be imported subject to source quality and safe-fetch controls. |
| SportsEngine direct sync | Implemented but unverified | Credential and adapter workflow exists; sell only after validating the customer account and data contract. |
| Daktronics read-only bridge | Implemented but unverified | A local adapter can normalize read-only state; each hardware deployment requires onsite verification. No general physical control. |
| GameChanger | Framework or demo only | Link or future source concept only. Do not promise automatic synchronization. |
| TeamSnap | Framework or demo only | Catalog/mock-level capability only. |
| LeagueApps | Framework or demo only | Catalog/mock-level capability only. |
| PlayMetrics | Framework or demo only | Catalog/mock-level capability only. |
| Nevco | Future | No generally live adapter. |
| Weather | Implemented | Venue weather profiles, manual/automatic response foundations, and provider-backed conditions where configured. |
| Email alert delivery | Implemented | Delivery attempts and status are recorded; production sending depends on configured email infrastructure. |
| Scoreboard control | Future or deployment-specific | Manual/public scoreboard experiences exist; physical write control is not a general product claim. |
| Camera, signage, PA, and general livestream control | Demo, framework, or deployment-specific | Inventory and preview concepts exist. Do not promise live control without a verified Edge/hardware deployment. |

“Implemented” is code-path evidence. “Live” requires configured credentials or hardware, successful rehearsal, and customer-specific verification.
