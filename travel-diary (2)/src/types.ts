export interface LocationInfo {
  description: string;
  heritage: string;
  bestTimeToVisit: string;
  famousFood: string[];
  attractions: Attraction[];
  resorts: Resort[];
  experiences: string[];
  cafesAndRestaurants: string[];
  shoppingPlaces: string[];
  trendingPlaces: string[];
  hiddenGems: string[];
  localEvents: { name: string; date: string; description: string }[];
  travelAlerts: string[];
  themeColor: string;
  heroImageUrl: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Attraction {
  name: string;
  description: string;
  rating?: number;
  reviews?: string[];
  imageUrl?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Resort {
  name: string;
  address: string;
  rating?: number;
  reviews?: string[];
  imageUrl?: string;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface ItineraryItem {
  day: number;
  time: string;
  activity: string;
  location: string;
  distanceFromResort: string;
  approxTime: string;
  outfitSuggestion: string;
  weather: string;
  crowdLevel: string;
  transportSuggestion: string;
  imageUrl: string;
  rating: number;
  reviews: string[];
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface Itinerary {
  plan: ItineraryItem[];
  totalBudget: number;
  individualBudget: number;
  currency: string;
  budgetBreakdown: { category: string; amount: number }[];
  budgetComparison: string;
}

export interface UserInputs {
  location: string;
  numPeople: number;
  residenceCountry: string;
  startDate: string;
  endDate: string;
  resortAddress: string;
  foodPreference: 'veg' | 'nonveg' | 'vegan';
  travelGroup: 'alone' | 'couple' | 'family' | 'friends';
  budgetStyle: 'cheap' | 'moderate' | 'luxury';
  travelVibe: 'chill' | 'adventure' | 'party' | 'cultural';
  itineraryStyle: 'relaxed' | 'packed';
  selectedAttractions: string[];
}

export interface SavedTrip {
  id: string;
  timestamp: number;
  inputs: UserInputs;
  itinerary: Itinerary;
  locationInfo: LocationInfo;
}
