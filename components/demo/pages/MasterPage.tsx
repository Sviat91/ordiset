"use client";

import { useMemo, useState } from "react";
import { useDemo } from "../demoContext";
import DemoTopBar from "../DemoTopBar";
import DemoFooter from "../DemoFooter";
import DemoImage from "../DemoImage";
import Marquee from "../Marquee";
import Calendar from "../booking/Calendar";
import ServiceSelect from "../booking/ServiceSelect";
import { MASTERS, MASTER_SERVICES } from "../data/masters";
import { MASTER_PHOTOS, MAREK_MARQUEE, REVIEW_MAP } from "../data/images";
import { ANNA_REVIEWS, type ReviewCard as ReviewCardData } from "../data/reviews";
import type { MasterId } from "../demoState";
import styles from "./MasterPage.module.css";

type MasterPageProps = {
  masterId: MasterId;
};

function ReviewCard({ card }: { card: ReviewCardData }) {
  if (card.type === "map") {
    return (
      <div className={styles.reviewCard}>
        <DemoImage slot={REVIEW_MAP} sizes="220px" className={styles.reviewMapImage} />
        <span className={styles.reviewMapLabel}>Find us on the map</span>
      </div>
    );
  }

  return (
    <div className={styles.reviewCard}>
      {card.type === "google" && <span className={styles.reviewBadge}>G · Verified Purchase</span>}
      <span className={styles.reviewName}>{card.name}</span>
      <span className={styles.reviewStars} aria-label={`${card.rating} out of 5 stars`}>
        {"★".repeat(card.rating)}
        {"☆".repeat(5 - card.rating)}
      </span>
      <p className={styles.reviewQuote}>{card.quote}</p>
    </div>
  );
}

export default function MasterPage({ masterId }: MasterPageProps) {
  const { state, dispatch } = useDemo();
  const [manageNoteOpen, setManageNoteOpen] = useState(false);

  const master = MASTERS[masterId];
  const services = MASTER_SERVICES[masterId];
  const seed = state.store?.seed ?? 0;

  const firstName = useMemo(() => master.name.split(" ")[0], [master.name]);

  return (
    <div className={styles.page}>
      <DemoTopBar showBack />
      <div className={styles.content}>
        <div className={styles.header}>
          <DemoImage slot={MASTER_PHOTOS[masterId]} sizes="80px" shape="circle" className={styles.avatar} />
          <div className={styles.headerText}>
            <h1 className={styles.heading}>Book a visit</h1>
            <p className={styles.headerRole}>
              {master.name} — {master.role}
            </p>
          </div>
        </div>

        <div className={styles.mainRow}>
          <Calendar
            masterId={masterId}
            seed={seed}
            selectedDateISO={state.draft.dateISO}
            onSelectDate={(dateISO) => dispatch({ type: "selectDate", dateISO })}
          />

          <div className={styles.rightColumn}>
            <ServiceSelect
              services={services}
              selectedId={state.draft.serviceId}
              onSelect={(serviceId) => dispatch({ type: "selectService", serviceId })}
            />

            <div className={styles.manageBox}>
              <button
                type="button"
                className={styles.managePill}
                onClick={() => setManageNoteOpen((open) => !open)}
              >
                Click to manage your booking
              </button>
              <p className={styles.manageNote} style={{ visibility: manageNoteOpen ? "visible" : "hidden" }}>
                Available in the live product
              </p>
            </div>

            <div className={styles.promoBox}>
              <p className={styles.promoLine}>🏷️ Wed, Thu 11:00–15:00: -20% on all services</p>
              <p className={styles.promoLine}>🏷️ -10% on all services</p>
            </div>
          </div>
        </div>

        <div className={styles.bioRow}>
          <div className={styles.bioCol}>
            <h2 className={styles.bioHeading}>About {firstName}</h2>
            <p className={styles.bioText}>{master.bio}</p>
          </div>
          <div className={styles.achievementsCol}>
            <h2 className={styles.bioHeading}>Achievements &amp; Certifications</h2>
            <ul className={styles.achievementsList}>
              {master.achievements.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.marqueeRow}>
          {masterId === "marek" ? (
            <Marquee className={styles.marquee}>
              {MAREK_MARQUEE.map((slot) => (
                <DemoImage key={slot.id} slot={slot} sizes="120px" className={styles.marqueePhoto} />
              ))}
            </Marquee>
          ) : (
            <Marquee className={styles.marquee}>
              {ANNA_REVIEWS.map((card, index) => (
                <ReviewCard key={index} card={card} />
              ))}
            </Marquee>
          )}
        </div>
      </div>
      <DemoFooter />
    </div>
  );
}
