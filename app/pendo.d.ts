interface Window {
  pendo?: {
    track: (eventName: string, metadata?: object) => void;
    trackAgent: (eventType: string, metadata: object) => void;
  };
}
