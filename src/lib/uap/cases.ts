import type { UapCase } from "./types";
import {
  getCase as getCaseCore,
  casesByTag as casesByTagCore,
  allTags as allTagsCore,
} from "./cases-core";

// Curated, in-repo dataset. Zero-AI, no network. Each case is written to
// present skeptic and proponent views fairly, with at least one citation.
const CASES: UapCase[] = [
  {
    slug: "roswell",
    name: "The Roswell Incident",
    dateLabel: "July 1947",
    location: "Roswell, New Mexico, USA",
    tags: ["Crash retrieval", "Military", "1940s", "USA"],
    summary:
      "Debris recovered on a ranch sparked a 'flying disc' headline, a fast military retraction, and decades of controversy.",
    reported:
      "In early July 1947, rancher Mac Brazel found scattered debris — foil-like material, sticks, and rubber — on the Foster ranch. The Roswell Army Air Field issued a press release announcing the recovery of a 'flying disc', which made front-page news before higher command retracted it within a day, calling the debris a weather balloon.",
    evidence:
      "Photographs of recovered foil and balsa-like debris in General Ramey's office; the original and retraction press releases; and decades-later witness testimony. No physical material from the site has ever been independently verified as non-terrestrial.",
    skepticalExplanations: [
      "The U.S. Air Force's 1994–1997 reports attribute the debris to Project Mogul, a then-classified array of high-altitude balloons used to listen for Soviet nuclear tests.",
      "Later 'alien bodies' accounts are explained as conflated memories of crash-test dummies dropped in the 1950s and of injured airmen from unrelated accidents.",
    ],
    openQuestions: [
      "Why did a trained airfield publicly announce a 'flying disc' at all if the debris was a familiar balloon type?",
      "How much of the later testimony is genuine memory versus decades of media reinforcement?",
    ],
    sources: [
      {
        label: "U.S. GAO — Records relating to the Roswell crash (1995)",
        url: "https://www.gao.gov/products/nsiad-95-187",
      },
      {
        label: "Encyclopaedia Britannica — Roswell incident",
        url: "https://www.britannica.com/event/Roswell-incident",
      },
    ],
  },
  {
    slug: "phoenix-lights",
    name: "The Phoenix Lights",
    dateLabel: "March 1997",
    location: "Phoenix, Arizona, USA",
    tags: ["Mass sighting", "Lights", "1990s", "USA"],
    summary:
      "Thousands across Arizona reported lights over Phoenix on one evening — likely two separate events hours apart.",
    reported:
      "On the evening of 13 March 1997, thousands of people across Arizona reported lights in the sky. Many described a large V-shaped formation of lights moving silently overhead earlier in the evening; later, a separate set of stationary lights hovered and slowly winked out over the city. Then-governor Fife Symington initially mocked the event, but years later said he had personally seen a craft he could not explain.",
    evidence:
      "Extensive home video and photographs of the later stationary lights; numerous consistent witness descriptions; and military flight records. The two phases are widely treated as distinct phenomena.",
    skepticalExplanations: [
      "The later 9–10 p.m. stationary lights match the timing and position of LUU-2 illumination flares dropped by Air National Guard A-10 aircraft on a training range southwest of Phoenix.",
      "The earlier V-formation is explained by some as a flight of aircraft passing high overhead, with the 'silent triangle' impression caused by lights seen against a dark sky.",
    ],
    openQuestions: [
      "Did the earlier V-formation and the later flares get merged in public memory into a single 'craft'?",
      "Why did some close-range witnesses insist on a solid, structured object blocking out the stars?",
    ],
    sources: [
      {
        label: "Encyclopaedia Britannica — Phoenix Lights",
        url: "https://www.britannica.com/topic/Phoenix-Lights",
      },
    ],
  },
  {
    slug: "belgian-wave",
    name: "The Belgian UFO Wave",
    dateLabel: "1989–1990",
    location: "Belgium",
    tags: ["Mass sighting", "Triangle", "Radar", "1980s", "1990s", "Europe"],
    summary:
      "A months-long wave of triangular-craft reports, including a night the Belgian Air Force scrambled F-16s.",
    reported:
      "Between late 1989 and 1990, large numbers of Belgians — including police officers — reported a silent, slow-moving triangular object with lights at its corners. On the night of 30–31 March 1990, the Belgian Air Force scrambled two F-16 jets after radar contacts; pilots reported brief radar locks on fast-moving targets they could not visually confirm.",
    evidence:
      "Hundreds of witness reports collected by the civilian group SOBEPS; F-16 radar data and cockpit recordings; and a widely circulated photograph of a black triangle. That famous photo was later admitted to be a hoax by its creator in 2011.",
    skepticalExplanations: [
      "Analysts argue the F-16 radar locks were caused by electronic interference and ground returns, not solid craft, given the implausibly extreme accelerations recorded.",
      "Many ground sightings are attributed to stars, aircraft, and helicopters seen under unusual conditions; the headline triangle photo was a confessed fake.",
    ],
    openQuestions: [
      "If the radar contacts were artifacts, why did experienced pilots and ground radar register them together on some passes?",
      "What did the many independent police witnesses actually see, given the most famous 'proof' was fabricated?",
    ],
    sources: [
      {
        label: "Encyclopaedia Britannica — unidentified flying object (Belgian wave)",
        url: "https://www.britannica.com/topic/unidentified-flying-object",
      },
    ],
  },
  {
    slug: "rendlesham-forest",
    name: "Rendlesham Forest Incident",
    dateLabel: "December 1980",
    location: "Suffolk, England, UK",
    tags: ["Military", "Landing trace", "Lights", "1980s", "Europe"],
    summary:
      "U.S. airmen near two RAF bases reported strange lights and a landed craft over several nights — 'Britain's Roswell'.",
    reported:
      "Over several nights around 26–28 December 1980, U.S. Air Force personnel stationed at RAF Woodbridge and RAF Bentwaters reported lights descending into Rendlesham Forest. Deputy base commander Lt. Col. Charles Halt led a team into the woods and tape-recorded the investigation in real time, describing a pulsing object and beams of light. Some airmen reported a small triangular craft and physical 'landing marks'.",
    evidence:
      "Halt's contemporaneous audio recording and his memo to the UK Ministry of Defence; reports of slightly elevated radiation at the alleged landing site; and broken-branch and ground impressions cited as landing traces.",
    skepticalExplanations: [
      "Investigators point to the Orfordness lighthouse, whose flashing beam was visible through the trees in the direction the men were looking, as the source of the 'pulsing light'.",
      "A bright fireball meteor earlier that night, plus bright stars (Sirius) low on the horizon, are offered as the initial trigger; the radiation readings were within natural background range.",
    ],
    openQuestions: [
      "Why did trained military officers, familiar with the local lighthouse, describe a structured craft at close range?",
      "Do the recorded ground impressions and the airmen's drawings reflect a real object or expectation under stress?",
    ],
    sources: [
      {
        label: "UK National Archives — Rendlesham Forest UFO files",
        url: "https://www.nationalarchives.gov.uk/ufos/",
      },
    ],
  },
  {
    slug: "nimitz-tic-tac",
    name: "USS Nimitz 'Tic Tac' Encounter",
    dateLabel: "November 2004",
    location: "Pacific Ocean, off Southern California, USA",
    tags: ["Military", "Navy", "Radar", "2000s", "USA"],
    summary:
      "Navy pilots and radar tracked a fast, wingless 'Tic Tac' object during training — later released by the Pentagon.",
    reported:
      "In November 2004, the carrier USS Nimitz strike group detected anomalous objects on radar over several days. On 14 November, Cmdr. David Fravor and other pilots were vectored to intercept and reported a smooth, white, wingless object about the size of a fighter — shaped 'like a Tic Tac' — that moved and accelerated in ways they said defied conventional aircraft, with no visible exhaust or control surfaces.",
    evidence:
      "The 'FLIR1' infrared targeting-pod video, later officially released by the U.S. Department of Defense; radar data from the cruiser USS Princeton; and on-record pilot testimony. The 2021 ODNI preliminary assessment listed the event among cases lacking a clear explanation.",
    skepticalExplanations: [
      "Some analysts argue the FLIR video's apparent rapid motion is partly an artifact of the camera's tracking and zoom, and that parallax exaggerates speed.",
      "Skeptics propose distant aircraft, balloons, or sensor/processing artifacts, noting that infrared imagery alone cannot establish size, range, or true velocity.",
    ],
    openQuestions: [
      "How do the radar tracks and multiple independent witnesses reconcile with purely optical-artifact explanations?",
      "What were the objects detected on radar for days before the visual intercept?",
    ],
    sources: [
      {
        label: "ODNI — Preliminary Assessment: Unidentified Aerial Phenomena (2021)",
        url: "https://www.dni.gov/files/ODNI/documents/assessments/Prelimary-Assessment-UAP-20210625.pdf",
      },
    ],
  },
  {
    slug: "kenneth-arnold",
    name: "Kenneth Arnold Sighting",
    dateLabel: "June 1947",
    location: "Mount Rainier, Washington, USA",
    tags: ["Pilot", "Lights", "1940s", "USA"],
    summary:
      "A private pilot's report of fast crescent objects gave the world the phrase 'flying saucer'.",
    reported:
      "On 24 June 1947, private pilot Kenneth Arnold reported nine bright, fast objects flying in formation near Mount Rainier while he searched for a downed plane. He estimated very high speeds and described their motion as 'like a saucer if you skipped it across water' — a phrase the press reshaped into 'flying saucer', launching the modern UFO era.",
    evidence:
      "Arnold's own detailed account, sketches, and speed/distance estimates; supporting press interviews; and the timing that coincided with a surge of similar reports nationwide. No photographs were taken.",
    skepticalExplanations: [
      "A leading explanation is a flight of aircraft or a formation of meteors/fireballs seen at distance, with speed badly overestimated from an uncertain range.",
      "Others propose atmospheric or optical effects, or pelicans/birds catching sunlight, given that Arnold's size and distance estimates were unverifiable.",
    ],
    openQuestions: [
      "How reliable were a single observer's speed estimates for objects of unknown size and range?",
      "Why did this particular report, among many, catalyze a worldwide wave of sightings?",
    ],
    sources: [
      {
        label: "Encyclopaedia Britannica — Kenneth Arnold",
        url: "https://www.britannica.com/biography/Kenneth-Arnold",
      },
    ],
  },
  {
    slug: "travis-walton",
    name: "Travis Walton Abduction Claim",
    dateLabel: "November 1975",
    location: "Apache-Sitgreaves National Forest, Arizona, USA",
    tags: ["Abduction", "Witnesses", "1970s", "USA"],
    summary:
      "A logger vanished for five days after coworkers said a light struck him; one of the most-investigated abduction claims.",
    reported:
      "On 5 November 1975, logger Travis Walton and six coworkers reported a glowing disc-shaped object in the forest. The men said Walton approached it and was struck by a beam of light, then fled in fear. Walton disappeared for five days before reappearing, claiming memories of non-human beings and a craft interior.",
    evidence:
      "Consistent testimony from the crew, several of whom passed (and one initially failed) polygraph examinations; the documented five-day disappearance and search; and Walton's later book and interviews. There is no physical or photographic evidence of a craft.",
    skepticalExplanations: [
      "Skeptics argue the event may have been staged or fabricated, possibly tied to a logging contract deadline, with polygraph results treated as unreliable.",
      "Walton's recovered 'memories' are explained by some as influenced by prior science-fiction media and the stress of the disappearance.",
    ],
    openQuestions: [
      "How did six independent witnesses maintain a consistent account for decades if it was staged?",
      "What accounts for Walton's whereabouts during the five missing days?",
    ],
    sources: [
      {
        label: "Skeptical Inquirer — The Travis Walton case",
        url: "https://skepticalinquirer.org/1996/01/the-travis-walton-abduction-1975/",
      },
    ],
  },
  {
    slug: "foo-fighters",
    name: "Foo Fighters of World War II",
    dateLabel: "1944–1945",
    location: "European and Pacific theaters",
    tags: ["Military", "Lights", "1940s", "Aviation"],
    summary:
      "Allied aircrews reported glowing balls of light pacing their planes during wartime night missions.",
    reported:
      "In the closing years of World War II, Allied pilots — especially night-fighter crews — repeatedly reported small glowing orbs or balls of light that paced their aircraft, sometimes for minutes, then darted away. Crews nicknamed them 'foo fighters'. The lights were not seen to attack, but their behavior unsettled airmen who feared a secret enemy weapon.",
    evidence:
      "Numerous wartime pilot reports and unit logs; postwar military inquiries that found no enemy weapon; and consistent descriptions across different theaters and crews. No photographs or wreckage exist.",
    skepticalExplanations: [
      "Leading explanations include St. Elmo's fire (electrical discharge on the airframe), ball lightning, and reflections of ground or anti-aircraft lights on cloud and canopy.",
      "Stress, fatigue, and the disorientation of night combat are cited as amplifying ordinary optical effects into apparent pursuing objects.",
    ],
    openQuestions: [
      "Why did the orbs appear to maintain speed and position with fast-moving aircraft?",
      "Were both Allied and Axis crews seeing the same phenomenon, and what was its physical cause?",
    ],
    sources: [
      {
        label: "Britannica / Smithsonian background on 'foo fighters'",
        url: "https://www.britannica.com/topic/unidentified-flying-object",
      },
    ],
  },
  {
    slug: "hudson-valley",
    name: "Hudson Valley Sightings",
    dateLabel: "1982–1986",
    location: "Hudson Valley, New York / Connecticut, USA",
    tags: ["Mass sighting", "Triangle", "Lights", "1980s", "USA"],
    summary:
      "Thousands reported a huge, silent, V- or boomerang-shaped array of lights over the region for several years.",
    reported:
      "From 1982 through the mid-1980s, thousands of residents across the Hudson Valley reported a very large, slow, silent object — often described as a V or boomerang covered in colored lights — drifting low over highways and towns. Sightings clustered on clear nights and drew heavy local press.",
    evidence:
      "A large volume of consistent witness reports and some photographs and video of light formations; investigations by author Philip Imbrogno and astronomer J. Allen Hynek's associates. No craft was ever recovered or unambiguously photographed.",
    skepticalExplanations: [
      "Investigators traced many sightings to groups of small private planes from a local airport flying in tight formation, sometimes with colored lights, creating the illusion of one huge craft.",
      "The silence and 'solid object' impression are attributed to distance, wind direction muffling engine noise, and the brain merging separate lights into a single shape.",
    ],
    openQuestions: [
      "Did formation-flying pilots account for all sightings, including the closest and lowest reports?",
      "Why did the phenomenon persist and recur over several years in the same region?",
    ],
    sources: [
      {
        label: "Center for UFO Studies (CUFOS) — Hudson Valley overview",
        url: "https://cufos.org/",
      },
    ],
  },
  {
    slug: "westall",
    name: "Westall School Sighting",
    dateLabel: "April 1966",
    location: "Westall, Melbourne, Australia",
    tags: ["Mass sighting", "Daylight", "Witnesses", "1960s", "Oceania"],
    summary:
      "Students and staff at an Australian school reported a daylight craft descending near the grounds.",
    reported:
      "On the morning of 6 April 1966, students and teachers at Westall High School and a nearby primary school in suburban Melbourne reported one or more silver-grey disc-shaped objects descending toward a grassy area beyond the school. Many said the object briefly landed or hovered before climbing away at speed, watched by scores of witnesses.",
    evidence:
      "Dozens of consistent witness accounts gathered then and decades later; a contemporaneous local newspaper report; and claimed ground impressions in the grass. No clear photographs survive, and authorities took no formal public action at the time.",
    skepticalExplanations: [
      "One explanation is a research or weather balloon (possibly from a nearby HIBAL high-altitude program) drifting and descending, mistaken for a structured craft.",
      "Skeptics note that the absence of photographs and the long gap before many accounts were recorded leaves room for embellishment and collective memory effects.",
    ],
    openQuestions: [
      "If it was a balloon, why did many witnesses describe controlled flight and a rapid climbing departure?",
      "Why was there so little official follow-up given the number of student and staff witnesses?",
    ],
    sources: [
      {
        label: "National Museum of Australia — Westall UFO sighting",
        url: "https://www.nma.gov.au/defining-moments/resources/westall-ufo-sighting",
      },
    ],
  },
];

export function getAllCases(): UapCase[] {
  return CASES;
}

export function getCase(slug: string): UapCase | null {
  return getCaseCore(CASES, slug);
}

export function casesByTag(tag: string): UapCase[] {
  return casesByTagCore(CASES, tag);
}

export function allTags(): string[] {
  return allTagsCore(CASES);
}
