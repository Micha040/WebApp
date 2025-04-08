import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GameView from '../pages/GameView';
import { BrowserRouter } from 'react-router-dom';

// Definiere einen erweiterten Socket-Typ
interface MockSocket {
  on: any;
  emit: any;
  off: any;
  getCalls: () => [string, any][];
}

// Mock für Socket.io
vi.mock('socket.io-client', () => ({
  io: () => {
    const mockSocket: MockSocket = {
      on: vi.fn(),
      emit: vi.fn(),
      off: vi.fn(),
      getCalls: () => []
    };
    
    // Erstelle eine separate Variable für die Aufrufe
    const calls: [string, any][] = [];
    
    // Überschreibe die on-Methode, um die Aufrufe zu speichern
    const originalOn = mockSocket.on;
    mockSocket.on = (event: string, callback: any) => {
      calls.push([event, callback]);
      return originalOn(event, callback);
    };
    
    // Füge eine Methode hinzu, um die Aufrufe abzurufen
    mockSocket.getCalls = () => calls;
    
    return mockSocket;
  }
}));

// Mock für useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom') as Record<string, unknown>;
  return {
    ...actual,
    useNavigate: () => mockNavigate
  };
});

// Mock für localStorage
const mockGetItem = vi.fn();
const mockSetItem = vi.fn();
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: mockGetItem,
    setItem: mockSetItem
  },
  writable: true
});

// Mock für die GameMap-Komponente
vi.mock('../components/GameMap', () => ({
  default: () => <div data-testid="game-map">Game Map</div>
}));

// Mock für fetch
global.fetch = vi.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({
      height: 20,
      width: 30,
      layers: [
        {
          data: Array(600).fill(0),
          height: 20,
          id: 1,
          name: 'Ground',
          opacity: 1,
          type: 'tilelayer',
          visible: true,
          width: 30,
          x: 0,
          y: 0
        }
      ],
      tileheight: 32,
      tilewidth: 32,
      type: 'map',
      version: '1.10'
    })
  })
);

describe('GameView Komponente', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetItem.mockReturnValue('TestUser');
    mockNavigate.mockReset();
    
    // Mock für setTimeout, um den Ladebildschirm zu überspringen
    vi.useFakeTimers();
  });
  
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sollte zur Game-Over-Seite navigieren, wenn das Spiel vorbei ist', async () => {
    render(
      <BrowserRouter>
        <GameView />
      </BrowserRouter>
    );

    // Schnelle die Timer vor, um den Ladebildschirm zu überspringen
    vi.advanceTimersByTime(3000);
    
    // Warte, bis die Komponente vollständig geladen ist
    await waitFor(() => {
      expect(screen.queryByText('Lade Spiel...')).not.toBeInTheDocument();
    });

    // Hole den Socket-Mock
    const socket = require('socket.io-client')() as MockSocket;
    
    // Finde den Callback für das navigateToGameOver-Event
    const navigateToGameOverCall = socket.getCalls().find(
      (call: [string, () => void]) => call[0] === 'navigateToGameOver'
    );
    
    if (navigateToGameOverCall) {
      // Führe den Callback aus
      navigateToGameOverCall[1]();
      
      // Überprüfe, ob die Navigation stattgefunden hat
      expect(mockNavigate).toHaveBeenCalledWith('/game-over');
    } else {
      // Wenn der Callback nicht gefunden wurde, markiere den Test als fehlgeschlagen
      expect(navigateToGameOverCall).toBeDefined();
    }
  });

  it('sollte Spieler korrekt rendern', async () => {
    render(
      <BrowserRouter>
        <GameView />
      </BrowserRouter>
    );

    // Schnelle die Timer vor, um den Ladebildschirm zu überspringen
    vi.advanceTimersByTime(3000);
    
    // Warte, bis die Komponente vollständig geladen ist
    await waitFor(() => {
      expect(screen.queryByText('Lade Spiel...')).not.toBeInTheDocument();
    });

    // Hole den Socket-Mock
    const socket = require('socket.io-client')() as MockSocket;
    
    // Simuliere ein playersUpdate-Event
    const playersUpdateCall = socket.getCalls().find(
      (call: [string, (data: any) => void]) => call[0] === 'playersUpdate'
    );
    
    if (playersUpdateCall) {
      // Führe den Callback mit Testdaten aus
      playersUpdateCall[1]({
        'player1': {
          username: 'TestUser',
          x: 100,
          y: 100,
          health: 100,
          skin: {
            ball: 'red',
            eyes: 'normal',
            mouth: 'smile',
            top: 'none'
          },
          isAlive: true
        },
        'player2': {
          username: 'OtherPlayer',
          x: 200,
          y: 200,
          health: 80,
          skin: {
            ball: 'blue',
            eyes: 'normal',
            mouth: 'smile',
            top: 'none'
          },
          isAlive: true
        }
      });
      
      // Überprüfe, ob die Spieler gerendert wurden
      expect(screen.getByText('TestUser')).toBeInTheDocument();
      expect(screen.getByText('OtherPlayer')).toBeInTheDocument();
    } else {
      // Wenn der Callback nicht gefunden wurde, markiere den Test als fehlgeschlagen
      expect(playersUpdateCall).toBeDefined();
    }
  });

  it('sollte Todesanzeige anzeigen, wenn der Spieler tot ist', async () => {
    render(
      <BrowserRouter>
        <GameView />
      </BrowserRouter>
    );

    // Schnelle die Timer vor, um den Ladebildschirm zu überspringen
    vi.advanceTimersByTime(3000);
    
    // Warte, bis die Komponente vollständig geladen ist
    await waitFor(() => {
      expect(screen.queryByText('Lade Spiel...')).not.toBeInTheDocument();
    });

    // Hole den Socket-Mock
    const socket = require('socket.io-client')() as MockSocket;
    
    // Simuliere ein playersUpdate-Event, bei dem der Spieler tot ist
    const playersUpdateCall = socket.getCalls().find(
      (call: [string, (data: any) => void]) => call[0] === 'playersUpdate'
    );
    
    if (playersUpdateCall) {
      // Führe den Callback mit Testdaten aus
      playersUpdateCall[1]({
        'player1': {
          username: 'TestUser',
          x: 100,
          y: 100,
          health: 0,
          skin: {
            ball: 'red',
            eyes: 'normal',
            mouth: 'smile',
            top: 'none'
          },
          isAlive: false
        }
      });
      
      // Überprüfe, ob die Todesanzeige angezeigt wird
      expect(screen.getByText('Du bist gestorben!')).toBeInTheDocument();
    } else {
      // Wenn der Callback nicht gefunden wurde, markiere den Test als fehlgeschlagen
      expect(playersUpdateCall).toBeDefined();
    }
  });
}); 