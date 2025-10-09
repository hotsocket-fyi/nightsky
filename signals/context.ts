import { signal } from "@preact/signals";
import { ComponentChild } from "preact";

export const contextActions = signal<ComponentChild | null>(null);
