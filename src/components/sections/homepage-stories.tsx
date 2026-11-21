import Image from "next/image";
import { Eyebrow, SectionTitle } from "@/components/ui/primitives";
import { homepageSamples } from "@/config/homepage-samples";
import { homepageTestimonials } from "@/config/homepage-testimonials";
import { SampleClipsCarousel } from "./sample-clips-carousel";
import styles from "./homepage-stories.module.css";

export function SampleClipsSection() {
  return (
    <section
      className={`section ${styles.samples}`}
      id="sample-clips"
      aria-labelledby="sample-clips-heading"
    >
      <div className="container">
        <SectionTitle
          headingId="sample-clips-heading"
          label="VIDEO EXAMPLES"
          title="Sample Clips"
          description="Explore five vertical clips with on-screen captions. Select a clip to watch it with sound."
        />
      </div>
      {homepageSamples.length === 5 ? (
        <SampleClipsCarousel samples={homepageSamples} />
      ) : (
        <p className={styles.samplesUnavailable}>
          Sample clips are not available yet.
        </p>
      )}
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section
      className={`section ${styles.testimonials}`}
      id="testimonials"
      aria-labelledby="testimonials-heading"
    >
      <div className={`container ${styles.testimonialLayout}`}>
        <div className={styles.testimonialIntro}>
          <Eyebrow pill>Testimonials</Eyebrow>
          <h2 id="testimonials-heading">
            Creators Love{" "}
            <span className="gradient-text">What Zybble Does</span>
          </h2>
          {homepageTestimonials.some(({ review }) => review === null) && (
            <p>Review copy is pending approval.</p>
          )}
        </div>
        <ul className={styles.testimonialList}>
          {homepageTestimonials.map(({ name, avatar, review }) => (
            <li key={name} className={`card ${styles.testimonialCard}`}>
              <span aria-hidden="true" className={styles.quoteMark}>
                “
              </span>
              {review ? (
                <blockquote>
                  <p>{review}</p>
                </blockquote>
              ) : (
                <div>
                  <span className={styles.reviewStatus}>Review pending</span>
                  <p>Temporary placeholder for an approved review.</p>
                </div>
              )}
              <div className={styles.testimonialProfile}>
                <Image
                  src={avatar}
                  alt="AI-illustrated avatar, not a likeness"
                  width={48}
                  height={48}
                />
                <h3>{name}</h3>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
