import { GoogleGenAI, Type } from "@google/genai";
import { LocationInfo, Itinerary, UserInputs } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getSuggestions(query: string, type: 'location' | 'hotel'): Promise<string[]> {
  if (!query || query.length < 3) return [];
  
  const prompt = type === 'location' 
    ? `Provide 5 popular travel destination suggestions starting with or related to "${query}". Return only a JSON array of strings.`
    : `Provide 5 popular hotels or resorts related to "${query}". Return only a JSON array of strings.`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: { type: Type.STRING }
      }
    }
  });

  try {
    return JSON.parse(response.text);
  } catch (e) {
    return [];
  }
}

export async function getLocationInfo(location: string, travelGroup: string): Promise<LocationInfo> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Provide detailed travel information for ${location} tailored for a ${travelGroup} trip. 
    Include description, heritage, best time to visit, famous food, top 10 attractions (name, short description, rating out of 5, 2 short reviews, and a descriptive image search query for a high-quality photo), 3-5 resorts (name, address, rating, reviews, and image search query), famous experiences, famous cafes/restaurants, and shopping places.
    Also provide approximate latitude and longitude coordinates for the destination, each attraction, and each resort.
    Identify "Trending places" 🔥 and "Hidden gems" 💎.
    List any local events or festivals happening in ${location}.
    Provide any current travel alerts (strikes, restrictions, safety updates).
    Also, suggest a dominant "theme color" (hex code) that represents the vibe of ${location} (e.g., desert-inspired orange, ocean blue, forest green) and a high-quality "hero image" search query for the destination.
    If it's a family trip, suggest family spots. If it's a couple trip, suggest romantic cafes and spots. If it's a friends trip, suggest party spots and social hubs.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          description: { type: Type.STRING },
          heritage: { type: Type.STRING },
          bestTimeToVisit: { type: Type.STRING },
          famousFood: { type: Type.ARRAY, items: { type: Type.STRING } },
          trendingPlaces: { type: Type.ARRAY, items: { type: Type.STRING } },
          hiddenGems: { type: Type.ARRAY, items: { type: Type.STRING } },
          themeColor: { type: Type.STRING },
          heroImageUrl: { type: Type.STRING },
          localEvents: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                date: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["name", "date", "description"]
            } 
          },
          travelAlerts: { type: Type.ARRAY, items: { type: Type.STRING } },
          coordinates: {
            type: Type.OBJECT,
            properties: {
              lat: { type: Type.NUMBER },
              lng: { type: Type.NUMBER }
            },
            required: ["lat", "lng"]
          },
          attractions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                rating: { type: Type.NUMBER },
                reviews: { type: Type.ARRAY, items: { type: Type.STRING } },
                imageUrl: { type: Type.STRING },
                coordinates: {
                  type: Type.OBJECT,
                  properties: {
                    lat: { type: Type.NUMBER },
                    lng: { type: Type.NUMBER }
                  },
                  required: ["lat", "lng"]
                }
              },
              required: ["name", "description", "coordinates", "rating", "reviews", "imageUrl"]
            }
          },
          resorts: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                address: { type: Type.STRING },
                rating: { type: Type.NUMBER },
                reviews: { type: Type.ARRAY, items: { type: Type.STRING } },
                imageUrl: { type: Type.STRING },
                coordinates: {
                  type: Type.OBJECT,
                  properties: {
                    lat: { type: Type.NUMBER },
                    lng: { type: Type.NUMBER }
                  },
                  required: ["lat", "lng"]
                }
              },
              required: ["name", "address", "coordinates", "rating", "reviews", "imageUrl"]
            }
          },
          experiences: { type: Type.ARRAY, items: { type: Type.STRING } },
          cafesAndRestaurants: { type: Type.ARRAY, items: { type: Type.STRING } },
          shoppingPlaces: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ["description", "heritage", "bestTimeToVisit", "famousFood", "attractions", "resorts", "experiences", "cafesAndRestaurants", "shoppingPlaces", "coordinates", "trendingPlaces", "hiddenGems", "localEvents", "travelAlerts"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function generateItinerary(inputs: UserInputs): Promise<Itinerary> {
  const prompt = `
    Plan a travel itinerary for ${inputs.location} from ${inputs.startDate} to ${inputs.endDate} for ${inputs.numPeople} people.
    The travelers are a ${inputs.travelGroup} group.
    Budget style: ${inputs.budgetStyle} (cheap / moderate / luxury).
    Travel vibe: ${inputs.travelVibe} (chill / adventure / party / cultural).
    Itinerary style: ${inputs.itineraryStyle} (relaxed vs packed).
    User is staying at: ${inputs.resortAddress}.
    Food preference: ${inputs.foodPreference}.
    Selected attractions to include: ${inputs.selectedAttractions.join(", ")}.
    The user resides in ${inputs.residenceCountry}.
    
    For each item in the itinerary, provide:
    - Day number
    - Time of day
    - Activity
    - Specific location
    - Estimated distance from the resort address (${inputs.resortAddress})
    - Approx time to explore
    - Best outfit suggestion based on the season of ${inputs.location} during ${inputs.startDate}.
    - Weather forecast for that day (e.g., "Sunny, 25°C").
    - Crowd levels / peak times (e.g., "Visit at 7 AM for fewer crowds").
    - Transport suggestion (e.g., "cab", "metro", "walking").
    - A descriptive image search query for a high-quality photo of the activity.
    - Rating (out of 5) and 2 short reviews for the activity.
    - Approximate latitude and longitude coordinates for the activity location.
    
    Also calculate a realistic budget in the currency of ${inputs.residenceCountry}.
    Include food, local travel, and attraction entry fees.
    Provide:
    - Total budget and individual budget per person.
    - A budget breakdown by category: Stay, Food, Travel, Activities.
    - A budget comparison (e.g., "If you travel next month, cost drops by 18%").
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          plan: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                day: { type: Type.INTEGER },
                time: { type: Type.STRING },
                activity: { type: Type.STRING },
                location: { type: Type.STRING },
                distanceFromResort: { type: Type.STRING },
                approxTime: { type: Type.STRING },
                outfitSuggestion: { type: Type.STRING },
                weather: { type: Type.STRING },
                crowdLevel: { type: Type.STRING },
                transportSuggestion: { type: Type.STRING },
                imageUrl: { type: Type.STRING },
                rating: { type: Type.NUMBER },
                reviews: { type: Type.ARRAY, items: { type: Type.STRING } },
                coordinates: {
                  type: Type.OBJECT,
                  properties: {
                    lat: { type: Type.NUMBER },
                    lng: { type: Type.NUMBER }
                  },
                  required: ["lat", "lng"]
                }
              },
              required: ["day", "time", "activity", "location", "distanceFromResort", "approxTime", "outfitSuggestion", "coordinates", "weather", "crowdLevel", "transportSuggestion", "imageUrl", "rating", "reviews"]
            }
          },
          totalBudget: { type: Type.NUMBER },
          individualBudget: { type: Type.NUMBER },
          currency: { type: Type.STRING },
          budgetBreakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                category: { type: Type.STRING },
                amount: { type: Type.NUMBER }
              },
              required: ["category", "amount"]
            }
          },
          budgetComparison: { type: Type.STRING }
        },
        required: ["plan", "totalBudget", "individualBudget", "currency", "budgetBreakdown", "budgetComparison"]
      }
    }
  });

  return JSON.parse(response.text);
}

export async function chatWithAI(message: string, context: any): Promise<string> {
  const prompt = `
    You are a travel assistant chatbot for the "Travel Diary" app. 
    The user is asking: "${message}"
    
    Current context:
    ${JSON.stringify(context)}
    
    Provide a helpful, concise response. 
    If they ask about safety, give specific safety tips for the location.
    If they ask for cheaper hotels, suggest some budget options in that location.
    If they ask to add a day, suggest a full day's itinerary for an extra day.
    Keep the tone friendly and professional.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt
  });

  return response.text || "I'm sorry, I couldn't process that request.";
}
