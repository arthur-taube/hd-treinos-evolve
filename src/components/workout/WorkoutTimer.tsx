import { useState, useRef, useCallback, useEffect } from "react";
import { Timer, Clock, Play, Pause, RotateCcw, Minus, Plus } from "lucide-react";

type Mode = "stopwatch" | "timer";

const WorkoutTimer = () => {
  const [visible, setVisible] = useState(false);
  const [mode, setMode] = useState<Mode>("timer");
  const [running, setRunning] = useState(false);

  // Stopwatch: time in centiseconds (10ms ticks)
  const [swTime, setSwTime] = useState(0);
  // Timer: time in seconds
  const [timerTime, setTimerTime] = useState(90); // 1:30 default
  const timerInitial = useRef(90);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const clearInt = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => () => clearInt(), [clearInt]);

  const playBeep = useCallback(() => {
    try {
      const ctx = audioCtxRef.current || new AudioContext();
      audioCtxRef.current = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.value = 0.3;
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // silent fallback
    }
  }, []);

  const startStop = useCallback(() => {
    if (running) {
      clearInt();
      setRunning(false);
      return;
    }

    setRunning(true);

    if (mode === "stopwatch") {
      const start = Date.now() - swTime * 10;
      intervalRef.current = setInterval(() => {
        setSwTime(Math.floor((Date.now() - start) / 10));
      }, 10);
    } else {
      if (timerTime <= 0) return setRunning(false);
      const target = Date.now() + timerTime * 1000;
      intervalRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((target - Date.now()) / 1000));
        setTimerTime(remaining);
        if (remaining <= 0) {
          clearInt();
          setRunning(false);
          playBeep();
        }
      }, 200);
    }
  }, [running, mode, swTime, timerTime, clearInt, playBeep]);

  const reset = useCallback(() => {
    clearInt();
    setRunning(false);
    if (mode === "stopwatch") {
      setSwTime(0);
    } else {
      setTimerTime(timerInitial.current);
    }
  }, [mode, clearInt]);

  const adjustTimer = useCallback((delta: number) => {
    if (running) return;
    setTimerTime(prev => {
      const next = Math.max(0, prev + delta);
      timerInitial.current = next;
      return next;
    });
  }, [running]);

  const switchMode = useCallback((newMode: Mode) => {
    if (newMode === mode) return;
    clearInt();
    setRunning(false);
    setMode(newMode);
  }, [mode, clearInt]);

  // Format helpers
  const formatStopwatch = (cs: number) => {
    const totalSecs = Math.floor(cs / 100);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    const c = cs % 100;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
  };

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div className="fixed left-0 right-0 z-20" style={{ bottom: 56 }}>
      {/* Toggle button */}
      <div className="flex justify-center">
        <button
          onClick={() => setVisible(v => !v)}
          className="w-12 h-6 rounded-t-full bg-card border border-b-0 border-border/60 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
          aria-label="Toggle timer"
        >
          <Timer size={14} />
        </button>
      </div>

      {/* Timer bar */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          visible ? "max-h-16 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-card border-t border-border/40 px-3 py-2 flex items-center gap-2">
          {/* Mode toggle - stacked vertically */}
          <div className="flex flex-col gap-0.5 shrink-0">
            <button
              onClick={() => switchMode("stopwatch")}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                mode === "stopwatch"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Clock size={12} className="inline mr-0.5" />
              Crono
            </button>
            <button
              onClick={() => switchMode("timer")}
              className={`px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
                mode === "timer"
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Timer size={12} className="inline mr-0.5" />
              Timer
            </button>
          </div>

          {/* Center: display with optional -5s button */}
          <div className="flex-1 flex items-center justify-center gap-2">
            {mode === "timer" && (
              <button
                onClick={() => adjustTimer(-5)}
                disabled={running}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 flex items-center gap-0.5 shrink-0"
              >
                <Minus size={12} />
                5s
              </button>
            )}

            <span className="font-mono text-lg font-semibold text-foreground tabular-nums min-w-[5ch] text-center">
              {mode === "stopwatch" ? formatStopwatch(swTime) : formatTimer(timerTime)}
            </span>

            {mode === "timer" && (
              <button
                onClick={() => adjustTimer(15)}
                disabled={running}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 flex items-center gap-0.5 shrink-0"
              >
                <Plus size={12} />
                15s
              </button>
            )}
          </div>

          {/* Right: controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              onClick={startStop}
              className={`p-1.5 rounded-md transition-colors ${
                running
                  ? "bg-destructive/20 text-destructive hover:bg-destructive/30"
                  : "bg-primary/20 text-primary hover:bg-primary/30"
              }`}
              aria-label={running ? "Parar" : "Iniciar"}
            >
              {running ? <Pause size={16} /> : <Play size={16} />}
            </button>
            <button
              onClick={reset}
              className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              aria-label="Zerar"
            >
              <RotateCcw size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkoutTimer;
