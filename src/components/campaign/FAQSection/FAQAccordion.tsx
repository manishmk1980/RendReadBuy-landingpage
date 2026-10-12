"use client";

import { useId, useState, type CSSProperties } from "react";
import type { FAQ } from "@/config/faqs";
import { track } from "@/lib/analytics";
import styles from "./FAQSection.module.css";

const ROWS = 3;

/**
 * Six questions in two columns of three; one answer open at a time across
 * both. Each column grows on its own, so opening an answer never shifts the
 * other column. Panels stay in the markup, so without JavaScript CSS shows
 * every answer.
 */
export function FAQAccordion({ items }: { items: readonly FAQ[] }) {
  const baseId = useId();
  const [openId, setOpenId] = useState<string | null>(null);

  const toggle = (faq: FAQ) => {
    const opening = openId !== faq.id;
    setOpenId(opening ? faq.id : null);
    // Fired from here, not data attributes, so only openings are counted.
    if (opening) track("faq_open", { placement: "faq", faq: faq.id });
  };

  const columns = [items.slice(0, ROWS), items.slice(ROWS)].filter((column) => column.length);

  return (
    <div className={styles.accordion}>
      {columns.map((column, columnIndex) => (
        <div key={columnIndex} className={styles.column}>
          {column.map((faq, rowIndex) => {
            const open = openId === faq.id;
            const buttonId = `${baseId}-${faq.id}-q`;
            const panelId = `${baseId}-${faq.id}-a`;
            return (
              <div
                key={faq.id}
                className={styles.item}
                data-open={open}
                style={{ "--row": rowIndex, "--col": columnIndex } as CSSProperties}
              >
                <h3 className={styles.question}>
                  <button
                    type="button"
                    id={buttonId}
                    className={styles.trigger}
                    aria-expanded={open}
                    aria-controls={panelId}
                    onClick={() => toggle(faq)}
                  >
                    <span>{faq.question}</span>
                    <span className={styles.icon} aria-hidden="true">
                      <svg viewBox="0 0 16 16">
                        <path d="M3.5 8h9" />
                        <path className={styles.iconVertical} d="M8 3.5v9" />
                      </svg>
                    </span>
                  </button>
                </h3>
                <div
                  id={panelId}
                  role="region"
                  aria-labelledby={buttonId}
                  className={styles.panel}
                >
                  <div className={styles.panelInner}>
                    <p className={styles.answer}>{faq.answer}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
