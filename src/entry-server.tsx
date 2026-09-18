import { renderToString } from "react-dom/server";
import ServerRouter from "./marketing/ServerRouter";

export function renderMarketing(path: string): string {
  return renderToString(<ServerRouter path={path} />);
}
