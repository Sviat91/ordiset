"use client";

import { useDemo } from "../demoContext";
import DemoTopBar from "../DemoTopBar";
import DemoFooter from "../DemoFooter";
import DemoImage from "../DemoImage";
import Marquee from "../Marquee";
import { MASTER_LIST } from "../data/masters";
import { MASTER_PHOTOS, HOME_MARQUEE } from "../data/images";
import styles from "./HomePage.module.css";

export default function HomePage() {
  const { dispatch } = useDemo();

  return (
    <div className={styles.page}>
      <DemoTopBar showBrand showAccount />
      <div className={styles.content}>
        <div className={styles.textBlock}>
          <h1 className={styles.heading}>Choose your specialist</h1>
          <p className={styles.subtitle}>Book a visit with your chosen specialist</p>
        </div>
        <div className={styles.masters}>
          {MASTER_LIST.map((master) => (
            <button
              key={master.id}
              type="button"
              className={styles.masterCard}
              onClick={() => dispatch({ type: "navigate", view: { name: "master", masterId: master.id } })}
            >
              <DemoImage slot={MASTER_PHOTOS[master.id]} sizes="360px" className={styles.masterPhoto} />
              <span className={styles.masterOverlay}>
                <span className={styles.masterName}>{master.name}</span>
                <span className={styles.masterRole}>{master.role}</span>
              </span>
            </button>
          ))}
        </div>
        <Marquee className={styles.marquee}>
          {HOME_MARQUEE.map((slot) => (
            <DemoImage key={slot.id} slot={slot} sizes="200px" className={styles.marqueeCard} />
          ))}
        </Marquee>
      </div>
      <DemoFooter />
    </div>
  );
}
