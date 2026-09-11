window.IH_META = {
  version: "0.9.0",
  rulesSnapshot: "2026-09-05",
  grades: ["H","G","F","E","D","C","B","A","S"],
  skillGrades: ["F","E","D","C","B","A"],
  gradeValue: {H:-2,G:-1,F:1,E:2,D:3,C:4,B:5,A:6,S:7},
  statStep: {H:-2,G:-1,F:0,E:1,D:2,C:3,B:4,A:5,S:6},
  statCostFromF: {H:-14,G:-7,F:0,E:7,D:14,C:21,B:28,A:35},
  standingThresholds: [
    {grade:"S",min:600},{grade:"A",min:500},{grade:"B",min:400},
    {grade:"C",min:300},{grade:"D",min:200},{grade:"E",min:100},{grade:"F",min:0}
  ],
  cooldowns: {F:0,E:1,D:2,C:3,B:4,A:5,S:null},
  sizes: [
    {id:"tiny",name:"Tiny",pointDelta:14,earned:true,height:"Under 2 feet",weight:"Under 8 lb",move:5,notes:"Strength actions -2; mundane damage received +2; Speed actions +2; Stealth +2; base movement 5 ft."},
    {id:"small",name:"Small",pointDelta:7,earned:true,height:"2 to 4 feet",weight:"8 to 60 lb",move:10,notes:"Strength actions -1; mundane damage received +1; Speed actions +1; Stealth +1; base movement 10 ft."},
    {id:"medium",name:"Medium",pointDelta:0,earned:false,height:"4'1\" to 7'11\"",weight:"61 to 499 lb",move:20,notes:"Default size. Base movement 20 ft."},
    {id:"large",name:"Large",pointDelta:-14,earned:false,height:"8 to 16 feet",weight:"500 to 4000 lb",move:40,notes:"Costs 14. Strength non-attack +1; mundane damage received -1; Speed -1; base movement 40 ft."},
    {id:"huge",name:"Huge",pointDelta:-28,earned:false,height:"Over 16 feet",weight:"Over 4000 lb",move:80,notes:"Costs 28. Strength non-attack +2; mundane damage received -2; Speed -2; base movement 80 ft."}
  ],
  languageByTree: {prime:"Terran",beast:"Beastial",fae:"Sylvan",construct:"Analog",monster:"Abyssal"},
  origins: {
    isekai:{name:"Isekai'd",freeSkill:"Appraisal",freeSkillNote:"Appraisal is free and automatically follows Standing."},
    native:{name:"World Native",freeSkill:"Area Knowledge",freeSkillNote:"One Area Knowledge is free and automatically follows Standing."}
  },
  trees: [
    {id:"prime",name:"Prime",warning:"",nativeRequirements:["Choose either 2 magic skills/affinities, 2 martial skills/techniques, or 2 secondary skills."],perks:["Born For This","Versatile"]},
    {id:"beast",name:"Beast",warning:"",nativeRequirements:["Natural Weapons F or Natural Armor F","2 sense skills"],perks:["Born For This","Conscious Expansion"]},
    {id:"fae",name:"Fae",warning:"",nativeRequirements:["Magic F","1 secondary skill"],perks:["Born For This"]},
    {id:"monster",name:"Monster",warning:"Hard mode. Monster-tree characters are inherently hostile/antagonistic by setting assumptions and are discouraged for new players.",nativeRequirements:["Magic F, Fighting Style F, or Natural Weapons F","1 movement skill","1 sense skill"],perks:["Born For This"]},
    {id:"construct",name:"Construct",warning:"",nativeRequirements:["1 defensive skill","2 secondary skills"],perks:["Born For This","Self Made"]}
  ],
  equipmentTypes: [
    {id:"melee",name:"Melee Weapon",stat:"Strength",natural:false},
    {id:"ranged",name:"Ranged Weapon",stat:"Precision",natural:false},
    {id:"shield",name:"Shield",stat:"Strength",natural:false},
    {id:"catalyst",name:"Magic Catalyst",stat:"Intelligence",natural:false},
    {id:"light",name:"Light Armor",stat:"Speed",natural:false},
    {id:"heavy",name:"Heavy Armor",stat:"Vitality",natural:false},
    {id:"natural-melee",name:"Natural Weapon",stat:"Strength",natural:true},
    {id:"natural-ranged",name:"Natural Ranged Weapon",stat:"Precision",natural:true},
    {id:"natural-catalyst",name:"Natural Catalyst",stat:"Intelligence",natural:true},
    {id:"natural-light",name:"Natural Light Armor",stat:"Speed",natural:true},
    {id:"natural-heavy",name:"Natural Heavy Armor",stat:"Vitality",natural:true}
  ],
  classRules: [
    {
      id:"caster",name:"Caster",tier:1,
      summary:"Magic specialist using a catalyst and several basic spell augmenters.",
      requirements:["Intelligence D","3 intelligence-based Secondary skills","Magic E","2 Element Affinities F","Range F","Area of Effect F","Targets F","Duration F","Catalyst E"],
      perk:"Magic Circle",
      autoCheck:"caster"
    },
    {
      id:"striker",name:"Striker",tier:1,
      summary:"Lightly armored one-handed martial combatant with movement training.",
      requirements:["Intelligence E","Strength D","Speed D","Fighting Style E using a one-handed weapon","Accurate and Penetrating techniques","Fast E","Warfare F","1 Secondary skill","One-handed melee weapon E","Light Armor E"],
      perk:"Agile",
      autoCheck:"striker"
    },
    {
      id:"nomad",name:"Nomad",tier:1,
      summary:"Well-traveled generalist built around two profession choices, four supplemental secondaries, movement, and one defining secondary.",
      requirements:["Intelligence C","Strength D, Speed D, or Precision D","2 profession choices at listed grade","4 supplemental Secondary skills from the Nomad list","1 listed movement skill F","1 defining Secondary skill F"],
      help:{
        profession:["Academia E","Agriculture E","Alchemy E","Animal Handling E","Architecture E","Artisan [type] E","Business E","Domestic Arts E","Healing E","Law E","Mining E","Navigation E","Visual Arts E","Profession [type] F"],
        supplemental:["Acrobatics F","Arcana F","Athletics F","Culture F","Empathy F","Engineering F","Etiquette F","Forgery F","Gaming F","Helming F","History F","Insight F","Investigation F","Language F","Medicine F","Nature F","Perception F","Physics F","Religion F","Riding F","Sleight of Hand F","Stealth F","Survival F","Traps F","Warfare F"],
        movement:["Fast F","Jumping F","Swim Speed F","Climbing F"],
        defining:["Deception F","Disguise F","Focus F","Interrogation F","Intimidation F","Leadership F","Lucky F","Performance [type] F","Persuasion F","Seduction F","Street Sense F"]
      },
      perk:"Talented Friends",
      autoCheck:"nomad"
    },
    {
      id:"pathforger",name:"Pathforger",tier:1,
      summary:"Vehicle pilot/operator with maintenance, navigation, engineering, and a vehicle asset.",
      requirements:["Strength E","Precision D","Intelligence D","Profession F","Helming F","Artisan F appropriate to vehicle","Navigation F","Engineering F","Gear F toolkit","Energized F","Light or Heavy Armor F","Vehicle Asset F"],
      perk:"Pathforged",
      autoCheck:"pathforger"
    }
  ],

  jobTitleThresholds: [
    {min:"S",rank:"Legendary"},
    {min:"A",rank:"Master"},
    {min:"C",rank:"Expert"},
    {min:"D",rank:"Adept"},
    {min:"F",rank:"Apprentice"}
  ],
  jobTitleSkillFamilies:["Fighting Style","Artisan","Masterwork #Maker","Masterwork #Harvester","Masterwork #Refiner","Masterwork #Builder","Masterwork #Infuser","Helming"],
  followerRules:{
    tamer:{freeBuddyGrade:"F",buddyStats:"All F",freeMovement:true},
    minions:{templatePoints:56,maxCount:5,creationMaxGrade:"B"},
    companion:{basePool:70,pointsPerGradeAfterF:35}
  },

  limiters: [
    {id:"Activation",ranks:["1 round preparing","1 minute preparing","1 hour preparing"]},
    {id:"Assisted",ranks:["1 named assistant","10 named assistants","100 named assistants"]},
    {id:"Backlash",ranks:["1 Health damage on failure","3 Health damage on failure","5 Health damage on failure"]},
    {id:"Charges",ranks:["4 uses per RP","2 uses per RP","1 use per RP"]},
    {id:"Concentration",ranks:["May not attack/defend while active","Only half-speed move and talk","Can do nothing for duration"]},
    {id:"Focused",ranks:["Telekinesis only; chosen element restriction","Telekinesis only; chosen element restriction","Telekinesis only; chosen element restriction"],special:true},
    {id:"Deplete",ranks:["Cooldown +2 posts","Cooldown +4 posts","Cooldown +6 posts"]},
    {id:"Equipment",ranks:["Portable special item required","Large/difficult item required","Stationary facility required"]},
    {id:"Imbue",ranks:["Imbue up to 3 people","Imbue up to 2 people","Imbue up to 1 person"],requires:"Charges"},
    {id:"Irreversible",ranks:["Cannot return to prior form without RP"],single:true},
    {id:"Maximum",ranks:["Must always use the skill at its maximum grade"],single:true},
    {id:"Object",ranks:["Skill exists on an item rather than being usable directly"],single:true},
    {id:"Permanent",ranks:["Skill is always active; ability grade is permanently on cooldown"],single:true},
    {id:"Unpredictable",ranks:["25% undesirable result","50% undesirable result","75% undesirable result"]}
  ],
  limiterBlockedSkillNames:["Martial Ethos","Martial Mastery","Summon Creature","Always Outnumbered","Duration Reduction","Regeneration","Resilient","Resistance","Asset","Attentive Student","Coup","Devour","Educated","Essence Eater","Gear","Item","Mentor","Narrative Booster","Sentience","Tamer","Villainous","Artisan","Enchanting","Masterwork"],
  rulings: {
    spendAllStartingPoints:true,
    assetCreationMax:"F",
    naturalEquipmentUsesNormalStatProgression:true,
    manaMeansMagic:true,
    chosenPathIgnoresPrereqs:true,
    racialTreeCount:5,
    classSubtotalsAreNonAuthoritative:true,
    actionRule:"A damaging ability may include one +1 action effect from a technique/affinity without increasing total action cost; additional distinct action effects increase action economy.",
    versatileIsOptional:true,
    hybridEquipment:"Each equipment type adds its normal per-grade cost and all selected type prerequisites apply.",
    passiveSkillsInAbilities:false,
    narrativeBoosterCreatesTitle:true,
    assetsUsuallyCreateTitles:true,
    artisanEquipmentDiscount:"A qualifying Artisan can apply 7 points per grade-step per normal equipment type to equipment of the same or lower grade. Natural equipment is excluded; special materials still pay the undiscounted premium.",
    switchEquipment:"Two equipment pieces may be linked for a one-time 7 point cost; only one is active at a time and switching uses one action.",
    startingLanguages:2
  }
};
