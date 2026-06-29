import type { VenueModeEndpointType, VenueModeProviderKey } from "@/lib/types";

export type VenueModeProviderCapability =
  | "venue_map"
  | "field_location"
  | "equipment_status"
  | "qr_entry"
  | "display_status"
  | "future_webhook";

export interface VenueModeProviderDefinition {
  key: VenueModeProviderKey;
  name: string;
  description: string;
  supportedEndpointTypes: VenueModeEndpointType[];
  capabilities: VenueModeProviderCapability[];
  implemented: boolean;
}

export const venueModeProviderDefinitions: VenueModeProviderDefinition[] = [
  {
    key: "manual",
    name: "Manual / GameDay OS",
    description: "Provider-neutral endpoints managed directly inside GameDay OS.",
    supportedEndpointTypes: ["qr_entry", "equipment", "display", "api", "other"],
    capabilities: ["venue_map", "qr_entry", "equipment_status", "display_status"],
    implemented: true,
  },
  {
    key: "meraki",
    name: "Cisco Meraki",
    description: "Future network/location provider placeholder. No Meraki API calls are implemented.",
    supportedEndpointTypes: ["location_provider", "equipment", "api"],
    capabilities: ["field_location", "equipment_status", "future_webhook"],
    implemented: false,
  },
  {
    key: "cisco_spaces",
    name: "Cisco Spaces",
    description: "Future indoor/location analytics provider placeholder. No Cisco Spaces API calls are implemented.",
    supportedEndpointTypes: ["location_provider", "api"],
    capabilities: ["field_location", "future_webhook"],
    implemented: false,
  },
  {
    key: "future_provider",
    name: "Future Provider",
    description: "Reserved for additional equipment, location, display, or venue operations providers.",
    supportedEndpointTypes: ["equipment", "location_provider", "display", "api", "other"],
    capabilities: ["equipment_status", "display_status", "future_webhook"],
    implemented: false,
  },
];
