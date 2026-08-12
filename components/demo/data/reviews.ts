export type PlainReviewCard = {
  type: "review";
  name: string;
  rating: number;
  quote: string;
};

export type GoogleReviewCard = {
  type: "google";
  name: string;
  rating: number;
  quote: string;
};

export type MapReviewCard = {
  type: "map";
};

export type ReviewCard = PlainReviewCard | GoogleReviewCard | MapReviewCard;

export const ANNA_REVIEWS: ReviewCard[] = [
  {
    type: "review",
    name: "Kasia W.",
    rating: 5,
    quote: "Anna understood exactly what I wanted from one photo. Best balayage I've had in Warsaw.",
  },
  {
    type: "google",
    name: "Marta D.",
    rating: 5,
    quote: "Verified Purchase — colour still looks fresh eight weeks later. Booking here again.",
  },
  {
    type: "review",
    name: "Ola P.",
    rating: 4,
    quote: "Lovely, calm salon and Anna talked me out of a colour that wouldn't have suited me.",
  },
  {
    type: "map",
  },
  {
    type: "review",
    name: "Zofia K.",
    rating: 5,
    quote: "My go-to for colour touch-ups. Always on time and the result matches the consultation.",
  },
  {
    type: "review",
    name: "Ewa T.",
    rating: 5,
    quote: "Recommended by a friend, now I recommend her too. Gentle with damaged hair.",
  },
];
