import { Landing } from "../App";
import AboutPage from "./AboutPage";
import { ArticleDetail, BlogIndex } from "./BlogPages";
import { FeatureDetail, FeaturesIndex } from "./FeaturesPages";
import { PrivacyPage, TermsPage } from "./LegalPages";
import NotFound from "./NotFound";
import PricingPage from "./PricingPage";

/** Static counterpart to the client router used by the build-time prerender. */
export default function ServerRouter({ path }: { path: string }) {
  if (path === "/") return <Landing />;
  if (path === "/pricing") return <PricingPage />;
  if (path === "/features") return <FeaturesIndex />;
  if (path.startsWith("/features/")) return <FeatureDetail path={path} />;
  if (path === "/blog") return <BlogIndex />;
  if (path.startsWith("/blog/")) return <ArticleDetail path={path} />;
  if (path === "/about") return <AboutPage />;
  if (path === "/privacy") return <PrivacyPage />;
  if (path === "/terms") return <TermsPage />;
  return <NotFound />;
}
