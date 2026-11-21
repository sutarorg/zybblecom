type Testimonial = {
  name: string;
  avatar: string;
  /** Publish only the person's approved wording. Null marks an unpublished review. */
  review: string | null;
};

export const homepageTestimonials: readonly Testimonial[] = [
  {
    name: "Tejas Sutar",
    avatar: "/images/testimonials/tejas.webp",
    review:
      "Zybble makes turning long videos into engaging shorts effortless. Less editing, more creating!",
  },
  {
    name: "Anshu Pandey",
    avatar: "/images/testimonials/anshu.webp",
    review:
      "Love how easy Zybble makes video repurposing. AI captions and smart framing save so much time!",
  },
  {
    name: "Letissia Merloni",
    avatar: "/images/testimonials/letissia.webp",
    review:
      "An easy, powerful way to turn long recordings into social-ready clips. A great tool for creators!",
  },
];
