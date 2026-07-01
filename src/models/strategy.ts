export interface CompassItem {
  label: string;
  text: string;
}

export interface OperatingRule {
  number: string;
  name: string;
  summary: string;
  text: string;
}

export interface Season {
  title: string;
  summary: string;
  points: string[];
  tags: string[];
}

export interface CareerStory {
  title: string;
  body: string;
  points: string[];
}

export interface Strategy {
  title: string;
  principle: string;
  northStar: string;
  currentSeason: string;
  careerCompass: {
    title: string;
    items: CompassItem[];
  };
  season: Season;
  rules: OperatingRule[];
  careerStory: CareerStory;
  longTermDirection: string[];
}
