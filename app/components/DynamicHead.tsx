"use client";
import { useEffect, useState } from "react";

const SUBDOMAIN_META: Record<string, { title: string; description: string }> = {
  "digitalrohtak": { title: "Digital Rohtak — Your City, Online", description: "One platform for all daily needs in Rohtak, Haryana" },
  "sadahaq": { title: "Sadahaq International — Empowering Communities", description: "Empowering communities through service, education & governance in Rohtak, Haryana" },
  "shopping": { title: "Shopping — Digital Rohtak", description: "Online shopping for all your daily needs in Rohtak" },
  "restaurant": { title: "Restaurants — Digital Rohtak", description: "Find the best restaurants and food joints in Rohtak" },
  "vegetables": { title: "Vegetables — Digital Rohtak", description: "Fresh vegetables delivery in Rohtak" },
  "fruits": { title: "Fruits — Digital Rohtak", description: "Fresh fruits delivery in Rohtak" },
  "grocery": { title: "Grocery — Digital Rohtak", description: "Grocery shopping and delivery in Rohtak" },
  "catering": { title: "Catering — Digital Rohtak", description: "Catering services in Rohtak for all occasions" },
  "education": { title: "Education — Digital Rohtak", description: "Schools, colleges and education services in Rohtak" },
  "legal": { title: "Legal Services — Digital Rohtak", description: "Legal services and advocates in Rohtak" },
  "repair": { title: "Repair Services — Digital Rohtak", description: "Home and appliance repair services in Rohtak" },
  "health": { title: "Health — Digital Rohtak", description: "Healthcare services and wellness in Rohtak" },
  "pharmacy": { title: "Pharmacy — Digital Rohtak", description: "Pharmacies and medicine delivery in Rohtak" },
  "jobs": { title: "Jobs — Digital Rohtak", description: "Job listings and employment opportunities in Rohtak" },
  "news": { title: "News — Digital Rohtak", description: "Latest news and updates from Rohtak" },
  "transport": { title: "Transport — Digital Rohtak", description: "Transport and travel services in Rohtak" },
  "salon": { title: "Salon & Beauty — Digital Rohtak", description: "Salons and beauty services in Rohtak" },
  "events": { title: "Events — Digital Rohtak", description: "Events and happenings in Rohtak" },
  "finance": { title: "Finance — Digital Rohtak", description: "Financial services and banking in Rohtak" },
  "electrician": { title: "Electrician — Digital Rohtak", description: "Electrician services in Rohtak" },
  "plumber": { title: "Plumber — Digital Rohtak", description: "Plumbing services in Rohtak" },
  "dairy": { title: "Dairy — Digital Rohtak", description: "Dairy products and milk delivery in Rohtak" },
  "bakery": { title: "Bakery — Digital Rohtak", description: "Bakeries and fresh baked goods in Rohtak" },
  "gym": { title: "Gym & Fitness — Digital Rohtak", description: "Gyms and fitness centers in Rohtak" },
  "tutor": { title: "Tutor — Digital Rohtak", description: "Home tutors and coaching in Rohtak" },
  "hospital": { title: "Hospitals — Digital Rohtak", description: "Hospitals and medical facilities in Rohtak" },
  "petrol": { title: "Petrol Pumps — Digital Rohtak", description: "Petrol pumps and fuel stations in Rohtak" },
  "waste": { title: "Waste Management — Digital Rohtak", description: "Waste management and recycling services in Rohtak" },
  "govt": { title: "Govt Services — Digital Rohtak", description: "Government services and offices in Rohtak" },
  "classifieds": { title: "Classifieds — Digital Rohtak", description: "Buy, sell and classified ads in Rohtak" },
  "property": { title: "Property — Digital Rohtak", description: "Real estate and property listings in Rohtak" },
  "food": { title: "Food Delivery — Digital Rohtak", description: "Food ordering and delivery in Rohtak" },
  "delivery": { title: "Delivery — Digital Rohtak", description: "Delivery services in Rohtak" },
  "hotel": { title: "Hotels — Digital Rohtak", description: "Hotels and accommodation in Rohtak" },
  "kabari": { title: "Kabari — Digital Rohtak", description: "Scrap dealers and recycling in Rohtak" },
};

export default function DynamicHead() {
  const [meta, setMeta] = useState<{ title: string; description: string } | null>(null);

  useEffect(() => {
    const host = window.location.hostname;
    let sub = "digitalrohtak";
    if (host !== "digitalrohtak.online" && host.endsWith(".digitalrohtak.online")) {
      sub = host.split(".")[0];
    }
    const m = SUBDOMAIN_META[sub];
    if (m) {
      document.title = m.title;
      // Update meta description
      let descTag = document.querySelector('meta[name="description"]');
      if (descTag) descTag.setAttribute("content", m.description);
      // Add canonical
      let canonical = document.querySelector('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", `https://${host}/`);
      // Add og tags
      let ogTitle = document.querySelector('meta[property="og:title"]');
      if (!ogTitle) { ogTitle = document.createElement("meta"); ogTitle.setAttribute("property", "og:title"); document.head.appendChild(ogTitle); }
      ogTitle.setAttribute("content", m.title);
      let ogDesc = document.querySelector('meta[property="og:description"]');
      if (!ogDesc) { ogDesc = document.createElement("meta"); ogDesc.setAttribute("property", "og:description"); document.head.appendChild(ogDesc); }
      ogDesc.setAttribute("content", m.description);
      let ogUrl = document.querySelector('meta[property="og:url"]');
      if (!ogUrl) { ogUrl = document.createElement("meta"); ogUrl.setAttribute("property", "og:url"); document.head.appendChild(ogUrl); }
      ogUrl.setAttribute("content", `https://${host}/`);
    }
  }, []);

  return null;
}
