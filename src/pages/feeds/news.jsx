import React from "react";
import FeedPage from "../../components/FeedPage";

export default function MainFeed() {
  return <FeedPage title="Новости" apiUrl="/api/feeds/news" />;
}
