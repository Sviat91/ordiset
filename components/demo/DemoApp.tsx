"use client";

import { useEffect, useReducer } from "react";
import { DemoContext } from "./demoContext";
import { initialState, reducer } from "./demoState";
import { readStore, writeStore } from "./demoStore";
import { useDemoScale } from "./useDemoScale";
import HomePage from "./pages/HomePage";
import MasterPage from "./pages/MasterPage";
import styles from "./DemoApp.module.css";

export default function DemoApp() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const { ref, scale } = useDemoScale();

  useEffect(() => {
    const hydrateFromStorage = () => {
      dispatch({ type: "hydrate", store: readStore() });
    };
    hydrateFromStorage();
  }, []);

  useEffect(() => {
    if (!state.store) return;
    writeStore(state.store);
  }, [state.store]);

  const ready = state.store !== null && scale > 0;
  const theme = state.store?.theme ?? "light";

  return (
    <DemoContext.Provider value={{ state, dispatch }}>
      <div className={styles.root} data-theme={theme}>
        <div className={styles.viewport} ref={ref}>
          <div className={styles.canvas} style={{ transform: `scale(${scale})`, opacity: ready ? 1 : 0 }}>
            {state.view.name === "master" ? <MasterPage masterId={state.view.masterId} /> : <HomePage />}
          </div>
        </div>
      </div>
    </DemoContext.Provider>
  );
}
