import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock für Socket.IO
vi.mock("socket.io-client", () => {
  return {
    io: () => {
      const mockSocket = {
        on: vi.fn(),
        emit: vi.fn(),
        disconnect: vi.fn(),
      };

      // Füge Mock-Implementierungen hinzu
      mockSocket.on.mockImplementation((event, callback) => {
        // Speichere den Callback für spätere Verwendung
        if (event === "playersUpdate") {
          setTimeout(() => callback({}), 0);
        }
        return mockSocket;
      });

      // Füge mock.calls Eigenschaft hinzu
      mockSocket.on.mock.calls = [];

      return mockSocket;
    },
  };
});

// Mock für die Browser-API
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock für fetch
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () =>
      Promise.resolve({
        height: 20,
        width: 30,
        layers: [
          {
            data: Array(600).fill(0),
            height: 20,
            id: 1,
            name: "Ground",
            opacity: 1,
            type: "tilelayer",
            visible: true,
            width: 30,
            x: 0,
            y: 0,
          },
        ],
        tileheight: 32,
        tilewidth: 32,
        type: "map",
        version: "1.10",
      }),
  })
);
