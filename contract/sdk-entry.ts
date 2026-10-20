// Hand-written entry point (this file MAY be edited).
// It exposes the GENERATED SDK in contract/sdk/ (DO NOT EDIT that dir)
// as window.CalendarSDK, pointed at the same origin serving this page.
import { client } from "./sdk/client.gen";
import {
  bookingsCancel,
  bookingsCreate,
  bookingsList,
  eventTypesCreate,
  eventTypesList,
  ownersList,
  slotsList,
} from "./sdk/sdk.gen";

client.setConfig({ baseUrl: "" });

(window as unknown as { CalendarSDK: unknown }).CalendarSDK = {
  ownersList,
  eventTypesList,
  eventTypesCreate,
  slotsList,
  bookingsList,
  bookingsCreate,
  bookingsCancel,
};
