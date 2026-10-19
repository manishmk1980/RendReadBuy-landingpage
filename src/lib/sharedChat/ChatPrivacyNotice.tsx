import { sharedChatDisclosure } from "@/config/sharedChat";
import { links } from "@/config/links";
import { trackingAttributes } from "@/lib/analytics";
import type { SharedChatSettings } from "./config";
import { ChatSupportButton } from "./ChatSupportButton";
import styles from "./ChatPrivacyNotice.module.css";

/** Shown only when chat is configured. The widget itself stays unloaded. */
export function ChatPrivacyNotice({ settings }: { settings: SharedChatSettings }) {
  const copy = sharedChatDisclosure;

  return (
    <section className={styles.notice} aria-labelledby="chat-support-privacy" data-pw-chat-avoid="">
      <div className={styles.inner}>
        <h2 id="chat-support-privacy" className={styles.title}>
          {copy.title}
        </h2>
        {copy.paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
        <p>
          {copy.privacyLead}{" "}
          <a
            href={links.privacy.href}
            className={styles.link}
            {...trackingAttributes("rentreadbuy_exit_click", {
              placement: "chat_privacy",
              destination: "privacy",
            })}
          >
            {copy.privacyLabel}
          </a>
          .
        </p>
        <ChatSupportButton settings={settings} />
      </div>
    </section>
  );
}
