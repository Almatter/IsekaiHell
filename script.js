$(document).ready(function() {
    // array of grades
    var grades = ['F','E', 'D', 'C', 'B', 'A', 'S'];
    var gradeValues = [7, 14, 21, 28, 35, 42, 49];
    var gradeValues2 = [14, 28, 42, 56, 70, 84, 98];
    var gradeValues3 = [21, 42, 63, 84, 105, 126, 147];
    var gradeValues4 = [28, 56, 84, 112, 140, 168, 196];
    var gradeValues5 = [35, 70, 105, 140, 175, 210, 245];
    var gradeValues6 = [56, 112, 168, 224, 280, 336, 392];
    var gradeValues7 = [70, 140, 210, 280, 350, 420, 490];
    var gradeValues8 = [42, 84, 126, 168, 210, 252, 294];
    var AOValues = [21, 21, 21, 21, 21, 21, 21];
    var NoValues = [0, 0, 0, 0, 0, 0, 0];
    var Values7 = [7, 7, 7, 7, 7, 7, 7];
    
    var equipmentTypes = [
        { name: 'Melee', statDependency: 'Strength' },
        { name: 'Ranged', statDependency: 'Precision' },
        { name: 'Catalyst', statDependency: 'Intelligence' },
        { name: 'Light armor', statDependency: 'Speed'},
        { name: 'Heavy armor', statDependency: 'Vitality'}
    ];

    var skillTypes = [
        { name: '<----------------------Movement---------------------->', statDependency: ' ', gradeValues: gradeValues, textInput: false },
        { name: 'AfterImage', statDependency: 'Speed', gradeValues: gradeValues3, textInput: false},
        { name: 'Fast', statDependency: 'Speed', gradeValues: gradeValues, textInput: false},
        { name: 'Flight', statDependency: 'Precision', gradeValues: gradeValues3, textInput: false },
        { name: 'Jumping', statDependency: 'Strength', gradeValues: gradeValues, textInput: false },
        { name: 'Portal', statDependency: 'Intelligence', gradeValues: gradeValues5, textInput: true },
        { name: 'Special Movement', statDependency: 'Precision', gradeValues: gradeValues, textInput: true },
        { name: 'Swim Speed', statDependency: 'Speed', gradeValues: gradeValues, textInput: false },
        { name: 'Teleport', statDependency: 'Intelligence', gradeValues: gradeValues3, textInput: false },
        { name: 'Tunneling', statDependency: 'Strength', gradeValues: gradeValues, textInput: false },
        { name: '<------------------------Mental------------------------>', statDependency: ' ', gradeValues: gradeValues, textInput: false },
        { name: 'Composed', statDependency: 'ChGrade', gradeValues: gradeValues, textInput: false },
        { name: 'Mind Shield', statDependency: 'Intelligence', gradeValues: gradeValues, textInput: false },
        { name: 'Postcognition', statDependency: 'Intelligence', gradeValues: gradeValues2, textInput: false },
        { name: 'Precognition', statDependency: 'Intelligence', gradeValues: gradeValues2, textInput: false },
        { name: 'Mind Control', statDependency: 'Intelligence', gradeValues: gradeValues3, textInput: false },
        { name: 'Telekinesis', statDependency: 'Intelligence', gradeValues: gradeValues4, textInput: false },
        { name: 'Telepathy', statDependency: 'Intelligence', gradeValues: gradeValues3, textInput: false },
        { name: '<------------------------Martial------------------------>', statDependency: ' ', gradeValues: gradeValues, textInput: false },
        { name: 'Fighting Style Melee [Specialized]', statDependency: 'Strength', gradeValues: gradeValues, textInput: false },
        { name: 'Fighting Style Melee', statDependency: 'Strength', gradeValues: gradeValues, textInput: false },
        { name: 'Fighting Style Ranged [Specialized]', statDependency: 'Precision', gradeValues: gradeValues, textInput: false },
        { name: 'Fighting Style Ranged', statDependency: 'Precision', gradeValues: gradeValues, textInput: false },
        { name: 'Steady Hands', statDependency: 'Precision', gradeValues: gradeValues, textInput: false },
        { name: 'Superstrength', statDependency: 'Strength', gradeValues: gradeValues2, textInput: false  },
        { name: '<-------------------------Magic------------------------->', statDependency: ' ', gradeValues: gradeValues, textInput: false  },
        { name: 'Type Affinity 7 cost', statDependency: 'Intelligence', gradeValues: gradeValues, textInput: true  },
        { name: 'Type Affinity 14 cost', statDependency: 'Intelligence', gradeValues: gradeValues2, textInput: true  },
        { name: 'Animate', statDependency: 'Intelligence', gradeValues: gradeValues5, textInput: false  },
        { name: 'Componentless Magic', statDependency: 'Magic', gradeValues: gradeValues3, textInput: false  },
        { name: 'Control Environment', statDependency: 'Intelligence', gradeValues: gradeValues, textInput: false  },
        { name: 'Energized', statDependency: 'ChGrade', gradeValues: gradeValues, textInput: false  },
        { name: 'Illusion', statDependency: 'Intelligence', gradeValues: gradeValues3, textInput: false  },
        { name: 'Magic', statDependency: 'Intelligence', gradeValues: gradeValues, textInput: false  },
        { name: 'Magic Area of Effect', statDependency: 'Magic', gradeValues: gradeValues, textInput: false  },
        { name: 'Magic Range', statDependency: 'Magic', gradeValues: gradeValues, textInput: false  },
        { name: 'Magic Targets', statDependency: 'Magic', gradeValues: gradeValues, textInput: false  },
        { name: 'Raise Undead', statDependency: 'Intelligence', gradeValues: gradeValues3, textInput: false  },
        { name: 'Selective Magic', statDependency: 'Magic', gradeValues: gradeValues, textInput: false  },
        { name: 'Spell Duration', statDependency: 'Magic', gradeValues: gradeValues, textInput: false  },
        { name: 'Summon Creature', statDependency: 'Intelligence', gradeValues: gradeValues6, textInput: false  },
        { name: 'Swarm', statDependency: 'Vitality', gradeValues: gradeValues2, textInput: true  },
        { name: 'Transformation', statDependency: 'Vitality', gradeValues: gradeValues4, textInput: true  },
        { name: 'Transmutation', statDependency: 'Intelligence', gradeValues: gradeValues5, textInput: false  },
        { name: '<-------------------------Sense------------------------->', statDependency: ' ', gradeValues: gradeValues, textInput: false  },
        { name: 'Appraisal (Isekai)', statDependency: 'StGrade', gradeValues: NoValues, textInput: false  },
        { name: 'Appraisal (Native)', statDependency: 'StGrade', gradeValues: gradeValues, textInput: false  },
        { name: 'Feature', statDependency: 'NULL', gradeValues: gradeValues, textInput: true  },
        { name: "Heightened Sense", statDependency: "Intelligence", gradeValues: gradeValues, textInput: true  },
        { name: "Sixth Sense", statDependency: "Intelligence", gradeValues: gradeValues, textInput: true  },
        { name: "Supersense", statDependency: "Intelligence", gradeValues: gradeValues, textInput: true  },
        { name: '<----------------------Defensive---------------------->', statDependency: ' ', gradeValues: gradeValues, textInput: false  },
        { name: 'Always Outnumbered', statDependency: 'StGrade', gradeValues: AOValues, textInput: false  },
        { name: "Barrier", statDependency: "Vitality", gradeValues: gradeValues2, textInput: false  },
        { name: "Change State", statDependency: "Vitality", gradeValues: gradeValues3, textInput: false  },
        { name: "Duration Reduction", statDependency: "Vitality", gradeValues: gradeValues, textInput: false  },
        { name: "Hardening", statDependency: "Vitality", gradeValues: gradeValues, textInput: false  },
        { name: "Healing", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false  },
        { name: "Regeneration", statDependency: "ChGrade", gradeValues: gradeValues, textInput: false  },
        { name: "Resilient", statDependency: "Vitality", gradeValues: gradeValues, textInput: true  },
        { name: "Resistance", statDependency: "Vitality", gradeValues: gradeValues, textInput: true  },
        { name: "Resistance [Physical]", statDependency: "Vitality", gradeValues: gradeValues3, textInput: false  },
        { name: "Resistance [Magical]", statDependency: "Vitality", gradeValues: gradeValues7, textInput: false  },
        { name: "Undetected", statDependency: "Precision", gradeValues: gradeValues2, textInput: true  },
        { name: '<-------------------------Misc-------------------------->', statDependency: ' ', gradeValues: gradeValues, textInput: false  },
        { name: "Alternate Identity", statDependency: 'Vitality', gradeValues: gradeValues, textInput: false  },
        { name: "Attentive Student", statDependency: 'StGrade', gradeValues: gradeValues, textInput: false  },
        { name: "Bane", statDependency: 'ChGrade', gradeValues: gradeValues2, textInput: true  },
        { name: "Bolster", statDependency: "Intelligence", gradeValues: gradeValues, textInput: true  },
        { name: 'Capacity', statDependency: 'NULL', gradeValues: gradeValues, textInput: false  },
        { name: 'Chameleon', statDependency: 'NULL', gradeValues: gradeValues3, textInput: false  },
        { name: 'Companion', statDependency: 'NULL', gradeValues: gradeValues5, textInput: false  },
        { name: "Concealment", statDependency: "Precision", gradeValues: gradeValues, textInput: false  },
        { name: "Conversion", statDependency: "Vitality", gradeValues: gradeValues3, textInput: false  },
        { name: "[Martial] Coup", statDependency: "Intelligence", gradeValues: gradeValues7, textInput: false  },
        { name: "[Magical] Coup", statDependency: "Intelligence", gradeValues: gradeValues7, textInput: false  },
        { name: "Devour", statDependency: 'StGrade', gradeValues: gradeValues, textInput: false  },
        { name: 'Educated', statDependency: 'ChGrade', gradeValues: gradeValues, textInput: true  },
        { name: "Elasticity", statDependency: "Vitality", gradeValues: gradeValues2, textInput: false  },
        { name: "Essence Eater", statDependency: 'ChGrade', gradeValues: gradeValues4, textInput: false  },
        { name: 'Gear', statDependency: 'NULL', gradeValues: gradeValues, textInput: true  },
        { name: 'Inspire', statDependency: 'ChGrade', gradeValues: gradeValues8, textInput: false  },
        { name: 'Item', statDependency: 'NULL', gradeValues: gradeValues5, textInput: true  },
        { name: "Language", statDependency: "Intelligence", gradeValues: gradeValues, textInput: true  },
        { name: "Lucky", statDependency: 'ChGrade', gradeValues: gradeValues, textInput: false  },
        { name: "Mentor", statDependency: 'ChGrade', gradeValues: gradeValues, textInput: false  },
        { name: "Mimic", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false  },
        { name: "Minions", statDependency: 'StGrade', gradeValues: gradeValues2, textInput: true  },
        { name: "Narrative Booster", statDependency: 'StGrade', gradeValues: gradeValues2, textInput: false  },
        { name: "Nullify", statDependency: "Intelligence", gradeValues: gradeValues5, textInput: true  },
        { name: "Pocket Dimension", statDependency: "Intelligence", gradeValues: gradeValues2, textInput: false  },
        { name: 'Sentience', statDependency: 'NULL', gradeValues: gradeValues2, textInput: false  },
        { name: "Size Change", statDependency: "Vitality", gradeValues: gradeValues5, textInput: false  },
        { name: "Skill Loan", statDependency: "Vitality", gradeValues: gradeValues3, textInput: false  },
        { name: "Tamer", statDependency: 'StGrade', gradeValues: gradeValues, textInput: false  },
        { name: "Villainous", statDependency: 'StGrade', gradeValues: AOValues, textInput: false  },
        { name: "Weaken Str", statDependency: "Strength", gradeValues: gradeValues, textInput: false },
        { name: "Weaken Pre", statDependency: "Precision", gradeValues: gradeValues, textInput: false },
        { name: "Weaken Int", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        { name: "Weaken Vit", statDependency: "Vitality", gradeValues: gradeValues, textInput: false },
        { name: "Weaken Spd", statDependency: "Speed", gradeValues: gradeValues, textInput: false },
        { name: "Wealth", statDependency: 'StGrade', gradeValues: gradeValues3, textInput: false  },
        { name: '<----------------------Secondary---------------------->', statDependency: ' ', gradeValues: gradeValues, textInput: false  },
        {name: "Academia", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Acrobatics", statDependency: "Precision", gradeValues: gradeValues, textInput: false },
        {name: "Agriculture", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Alchemy", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Animal Handling", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Arcana", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Architecture", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Area Knowledge (Isekai)", statDependency: "Intelligence", gradeValues: gradeValues, textInput: true },
        {name: "Area Knowledge (Native)", statDependency: "StGrade", gradeValues: NoValues, textInput: true },
        {name: "Artisan", statDependency: "Precision", gradeValues: gradeValues, textInput: true },
        {name: "Athletics", statDependency: "Strength", gradeValues: gradeValues, textInput: false },
        {name: "Builder", statDependency: "StGrade", gradeValues: gradeValues, textInput: true },
        {name: "Business", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Climbing", statDependency: "Strength", gradeValues: gradeValues, textInput: false },
        {name: "Controlled Breathing", statDependency: "Vitality", gradeValues: gradeValues, textInput: false },
        {name: "Culture", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Deception", statDependency: "ChGrade", gradeValues: gradeValues, textInput: false },
        {name: 'Developer', statDependency: 'NULL', gradeValues: gradeValues, textInput: true  },
        {name: "Disguise", statDependency: "ChGrade", gradeValues: gradeValues, textInput: false },
        {name: "Domestic Arts", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Empathy", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Engineering", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Etiquette", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Focus", statDependency: "Intelligence", gradeValues: gradeValues3, textInput: false },
        {name: "Forgery", statDependency: "Precision", gradeValues: gradeValues, textInput: false },
        {name: "Gaming", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Harvester", statDependency: "StGrade", gradeValues: gradeValues, textInput: true },
        {name: "Helming", statDependency: "Precision", gradeValues: gradeValues, textInput: true },
        {name: "History", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Infuser", statDependency: "Intelligence", gradeValues: gradeValues, textInput: true },
        {name: "Insight", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Interrogation", statDependency: "ChGrade", gradeValues: gradeValues, textInput: false },
        {name: "Intimidation", statDependency: "ChGrade", gradeValues: gradeValues, textInput: false },
        {name: "Investigation", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Law", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Leadership", statDependency: "ChGrade", gradeValues: gradeValues, textInput: false },
        {name: "Maker Str", statDependency: "Strength", gradeValues: gradeValues, textInput: true },
        {name: "Maker Pre", statDependency: "Precision", gradeValues: gradeValues, textInput: true },
        {name: "Maker Int", statDependency: "Intelligence", gradeValues: gradeValues, textInput: true },
        {name: "Maker Vit", statDependency: "Vitality", gradeValues: gradeValues, textInput: true },
        {name: "Maker Spd", statDependency: "Speed", gradeValues: gradeValues, textInput: true },
        {name: "Medicine", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Nature", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Navigation", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Perception", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Performance", statDependency: "ChGrade", gradeValues: gradeValues, textInput: true },
        {name: "Persuasion", statDependency: "ChGrade", gradeValues: gradeValues, textInput: false },
        {name: "Physics", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Profession Str", statDependency: "Strength", gradeValues: gradeValues, textInput: true },
        {name: "Profession Pre", statDependency: "Precision", gradeValues: gradeValues, textInput: true },
        {name: "Profession Int", statDependency: "Intelligence", gradeValues: gradeValues, textInput: true },
        {name: "Profession Vit", statDependency: "Vitality", gradeValues: gradeValues, textInput: true },
        {name: "Profession Spd", statDependency: "Speed", gradeValues: gradeValues, textInput: true },
        {name: "Refiner Str", statDependency: "Strength", gradeValues: gradeValues, textInput: true },
        {name: "Refiner Pre", statDependency: "Precision", gradeValues: gradeValues, textInput: true },
        {name: "Refiner Int", statDependency: "Intelligence", gradeValues: gradeValues, textInput: true },
        {name: "Refiner Vit", statDependency: "Vitality", gradeValues: gradeValues, textInput: true },
        {name: "Refiner Spd", statDependency: "Speed", gradeValues: gradeValues, textInput: true },
        {name: "Religion", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Riding", statDependency: "Precision", gradeValues: gradeValues, textInput: false },
        {name: "Seduction", statDependency: "ChGrade", gradeValues: gradeValues, textInput: false },
        {name: "Sleight of Hand", statDependency: "Precision", gradeValues: gradeValues, textInput: false },
        {name: "Stealth", statDependency: "Precision", gradeValues: gradeValues, textInput: false },
        {name: "Street Sense", statDependency: "ChGrade", gradeValues: gradeValues, textInput: false },
        {name: "Survival", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Swimming", statDependency: "Vitality", gradeValues: gradeValues, textInput: false },
        {name: "Traps", statDependency: "Precision", gradeValues: gradeValues, textInput: false },
        {name: "Visual Arts", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        {name: "Warfare", statDependency: "Intelligence", gradeValues: gradeValues, textInput: false },
        { name: '<-------------------------WIP-------------------------->', statDependency: ' ', gradeValues: gradeValues, textInput: false  },
        { name: "Tamer Breeding", statDependency: 'StGrade', gradeValues: gradeValues, textInput: false  },
        { name: "Tamer Buddy Awakening", statDependency: 'StGrade', gradeValues: gradeValues, textInput: false  },
        { name: "Tamer Buddy Maintenance", statDependency: 'StGrade', gradeValues: gradeValues, textInput: false  },
        { name: "Tamer Element Training", statDependency: 'StGrade', gradeValues: gradeValues, textInput: false  },
        { name: "Tamer Merging", statDependency: 'StGrade', gradeValues: gradeValues, textInput: false  },
        { name: "Tamer Skill Training", statDependency: 'StGrade', gradeValues: gradeValues, textInput: false  },
        { name: "Tamer Stat Training", statDependency: 'StGrade', gradeValues: gradeValues, textInput: false  },
        {name: "Enchanting", statDependency: "NULL", gradeValues: gradeValues, textInput: false },
        {name: "Polymorph", statDependency: "Intelligence", gradeValues: gradeValues4, textInput: false },
        {name: "Magic School", statDependency: "NULL", gradeValues: gradeValues, textInput: true },
        {name: "Magic Domain", statDependency: "NULL", gradeValues: gradeValues, textInput: true },
        {name: "Martial Ethos", statDependency: "NULL", gradeValues: gradeValues, textInput: true },
        {name: "Martial Mastery", statDependency: "NULL", gradeValues: gradeValues, textInput: true }
    ];
    //this is for specialized
    var techniqueCosts = {
        "Accurate": 21,
        "Area": 21,
        "Aura": 21,
        "Blight": 21,
        "Blind Fighter": 7,
        "Blind Ranged Fighting": 7,
        "Breaker": 21,
        "Contact": 21,
        "Contagion": 21,
        "Continuing": 21,
        "Deflect": 21,
        "Drain": 21,
        "Enervation": 21,
        "Flare": 21,
        "Flexible": 21,
        "Homing": 21,
        "Hot Shot": 35,
        "Incapacitating": 35,
        "Incurable": 21,
        "Indirect": 21,
        "Irritant": 21,
        "Knockback": 21,
        "Linked": 21,
        "Vorpal": 35,
        "Non-Lethal": 21,
        "Penetrating": 21,
        "Quake": 21,
        "Range": 21,
        "Reach": 21,
        "Reflect": 35,
        "Selective": 21,
        "Spreading": 21,
        "Tangle": 21,
        "Trap": 21,
        "Vampiric": 35     
    };
    //this is for normal fighting style
    var techniqueCosts2 = {
        "Accurate": gradeValues,
        "Area": gradeValues,
        "Aura": gradeValues,
        "Blight": gradeValues,
        "Blind Fighter": Values7,
        "Blind Ranged Fighting": Values7,
        "Breaker": gradeValues,
        "Contact": gradeValues,
        "Contagion": gradeValues,
        "Continuing": gradeValues,
        "Deflect": gradeValues,
        "Drain": gradeValues,
        "Enervation": gradeValues,
        "Flare": gradeValues,
        "Flexible": gradeValues,
        "Homing": gradeValues,
        "Hot Shot": gradeValues2,
        "Incapacitating": gradeValues2,
        "Incurable": gradeValues,
        "Indirect": gradeValues,
        "Irritant": gradeValues,
        "Knockback": gradeValues,
        "Linked": gradeValues,
        "Vorpal": gradeValues2,
        "Non-Lethal": gradeValues,
        "Penetrating": gradeValues,
        "Quake": gradeValues,
        "Range": gradeValues,
        "Reach": gradeValues,
        "Reflect": gradeValues2,
        "Selective": gradeValues,
        "Spreading": gradeValues,
        "Tangle": gradeValues,
        "Trap": gradeValues,
        "Vampiric": gradeValues2        
    };

    $('.stat-grade, #earned-points').change(function() {
        calculatePoints();
        calculateStandingGrade();
        calculateCharacterGrade();
        var changedStat = $(this).attr('id');
        removeDependentEquipment(changedStat);
        removeDependentSkills(changedStat);
        removeFightingStyleHeaders();
        updateEquipmentOptions();
        updateSkillOptions();
    });

    // Enable/disable companion grade dropdown based on companion checkbox state
    $('#companion').change(function() {
        if ($(this).is(':checked')) {
            $('#companion-grade').prop('disabled', false);
        } else {
            $('#companion-grade').prop('disabled', true);
            $('#companion-grade').val('-35'); // Reset to F grade if unchecked
        }
        calculatePoints();
    });

    $('.add-technique').click(function() {
        calculatePoints();
    });

    var docText = "";
    $(function () {
    // Use the *export* endpoint, not the edit link
    var docUrl = "https://docs.google.com/document/d/1Mx7LjTHszhYawiwUfOZEK-8XgoUv1NDBZRxs9lNUY-E/export?format=txt";
    $("#loading").show();
        
    $.ajax({
        url: docUrl,
        method: "GET",
        success: function(data) {
            // The document text is now in `data`
            console.log("Loaded doc text:", data);
            docText = data;
            
            // Example: place into the page
            $("#output").text("Loaded");
        },
        error: function(e) {
            $("#output").text("Failed to load");
            console.error("Error fetching doc:", e);
        },
        complete: function(){
            $("#loading").hide();
        }
    });
});

    $('.remove-technique').click(function() {
        $(this).parent().remove();
        calculatePoints();
    });

    $('#born-for-this, #cashback, #companion, #companion-grade, #minion').change(function() {
        calculatePoints();
    });

     $("#skill-select").on("change", function () {
        // the text of the selected <option>
        var selected = $(this).val(); // example: "jumping"
        var chunk = getChunk(selected, docText);
        chunk = chunk.replace(/_/g, "");
        $("#skill-description").html("<h3>" + selected + "</h3>" + chunk + "<br>");
    });

    function getChunk(tag, doc) {
    // Create "#jumping"
    var searchTag = "#" + tag;

    // Find starting position
    var start = doc.indexOf(searchTag);
    if (start === -1) return "";

    // Start of content = end of tag line
    start = doc.indexOf("\n", start);
    if (start === -1) start = doc.length;

    // Find next tag beginning with "#"
    // Using regex to find the NEXT "#something"
    var nextTagRegex = /\n#/g;
    nextTagRegex.lastIndex = start;

    var nextMatch = nextTagRegex.exec(doc);
    var end = nextMatch ? nextMatch.index : doc.length;

    // Extract and trim
    return doc.substring(start, end).trim();
}


    // add skill
    $('#add-skill').click(function() {
        var selectedSkill = $('#skill-select').val();
        var skillType = skillTypes.find(s => s.name === selectedSkill);

        var pointCost2 = skillType.gradeValues[0]; // Use the first value in gradeValues
        var relevantStatValue2 = $('#' + skillType.statDependency.toLowerCase()).val();
        if (skillType.textInput) {
            var skillRow = $('<div class="skill-row" data-stat-dependency="' + skillType.statDependency + '"><span>' + selectedSkill + ' </span><input type="text" placeholder="Enter name"> <select class="skill-grade"></select> <span class="skill-cost">' + pointCost2 + '</span> <button class="remove-button">&times;</button></div>');
        }
        else {
            var skillRow = $('<div class="skill-row" data-stat-dependency="' + skillType.statDependency + '"><span>' + selectedSkill + ' </span> <select class="skill-grade"></select> <span class="skill-cost">' + pointCost2 + '</span> <button class="remove-button">&times;</button></div>');
        }
        $('#skill-list').append(skillRow);
        var $gradeDropdown2 = skillRow.find('.skill-grade');
        
        populateGrades3($gradeDropdown2, relevantStatValue2, skillType.gradeValues, selectedSkill);

        // Add change event to the grade dropdown 
        $gradeDropdown2.change(function() {
            var selectedGradeIndex2 = $(this).prop('selectedIndex');
            var newPointCost2 = skillType.gradeValues[selectedGradeIndex2];
            $(this).siblings('.skill-cost').text(newPointCost2);

            //track magic grade
            if (selectedSkill === 'Magic') {
                $('#magic').val(gradeValues[selectedGradeIndex2-1]);
                updateSkillOptions();
                removeMagicSkills();
            } else if (selectedSkill === 'Fighting Style Ranged' || selectedSkill === 'Fighting Style Melee' || selectedSkill === 'Fighting Style Ranged [Specialized]' || selectedSkill === 'Fighting Style Melee [Specialized]') {
                removeFightingStyleTechniques();
            }

            calculatePoints();
        });
        
        if (selectedSkill === 'Fighting Style Melee [Specialized]' || selectedSkill === 'Fighting Style Ranged [Specialized]') {
            addFightingStyleHeader();
        }

        if (selectedSkill === 'Fighting Style Melee' || selectedSkill === 'Fighting Style Ranged') {
            addFightingStyleHeader2();
        }

        // Add click event to the remove button
        skillRow.find('.remove-button').click(function() {
            if (selectedSkill === 'Magic') {
                $('#magic').val(0);
                updateSkillOptions();
                removeMagicSkills();
            } else if (selectedSkill === 'Fighting Style Melee [Specialized]' || selectedSkill === 'Fighting Style Ranged [Specialized]' || selectedSkill === 'Fighting Style Melee' || selectedSkill === 'Fighting Style Ranged') {
                removeFightingStyleHeaders();
            }

            $(this).parent().remove();
            calculatePoints();
        });


        calculatePoints();
    });

    // add equipment
    $('#add-equipment').click(function() {
        var selectedEquipment = $('#equipment-select').val();
        var pointCost = gradeValues[0];
        var equipmentType = equipmentTypes.find(e => e.name === selectedEquipment);
        var relevantStatValue = $('#' + equipmentType.statDependency.toLowerCase()).val();

        var equipmentRow = $('<div class="equipment-row" data-stat-dependency="' + equipmentType.statDependency + '"><span>' + selectedEquipment + '</span> <select class="equipment-grade"></select> <span class="equipment-cost">' + pointCost + '</span> <label><input type="checkbox" class="equipment-option" value="natural"> Natural equipment</label><label><input type="checkbox" class="equipment-option" value="mythril"> Mythril</label><label><input type="checkbox" class="equipment-option" value="orichalcum"> Orichalcum</label> <button class="remove-button">&times;</button></div>');
        $('#equipment-list').append(equipmentRow);
        var $gradeDropdown = equipmentRow.find('.equipment-grade');
        
        populateGrades2($gradeDropdown, relevantStatValue);

        // Add change event to the grade dropdown 
        $gradeDropdown.change(function() {
            var selectedGradeIndex = $(this).prop('selectedIndex');
            var newPointCost = gradeValues[selectedGradeIndex];
            $(this).siblings('.equipment-cost').text(newPointCost);
            calculatePoints();
        });

        // Add click event to the checkboxes
        equipmentRow.find('.equipment-option').change(function() {
            updateEquipmentCost($(this).closest('.equipment-row'));
            calculatePoints();
        });

        // Add click event to the remove button
        equipmentRow.find('.remove-button').click(function() {
            $(this).parent().remove();
            calculatePoints();
        });

        calculatePoints();
    });

    // add custom
    $('#add-custom').click(function() {
        var customRow = $('<div class="custom-row"><input type="text" placeholder="Enter name" class="custom"><select class="custom-grade"></select><input type="number" placeholder="Cost" class="custom-price"><button class="remove-button">&times;</button></div>');
        $('#custom').append(customRow);

        populateGrades(customRow.find('.custom-grade'));

        // Add change event to the grade dropdown and price input
        customRow.find('.custom-price').change(function() {
            updateCustomCost(customRow);
            calculatePoints();
        });

        // Add click event to the remove button
        customRow.find('.remove-button').click(function() {
            $(this).parent().remove();
            calculatePoints();
        });

        calculatePoints();
    });


    function removeDependentSkills(changedStat) {
        $('.skill-row').each(function() {
            var statDependency = $(this).data('stat-dependency');
            if (statDependency.toLowerCase() === changedStat || statDependency.toLowerCase() === 'chgrade' || statDependency.toLowerCase() === 'magic' || statDependency.toLowerCase() === 'stgrade') {
                $(this).remove();
            }
        });
    }

    function removeDependentEquipment(changedStat) {
        $('.equipment-row').each(function() {
            var statDependency = $(this).data('stat-dependency');
            if (statDependency.toLowerCase() === changedStat) {
                $(this).remove();
            }
        });
    }


    function updateCustomCost(customRow) {
        var customPrice = parseInt(customRow.find('.custom-price').val()) || 0;

        // Use the custom price as the cost
        customRow.find('.custom-price').val(customPrice);
    }
    

    // Function to update equipment options based on stat dependencies
    function updateEquipmentOptions() {
        var strength = $('#strength').val();
        var precision = $('#precision').val();
        var intelligence = $('#intelligence').val();
        var vitality = $('#vitality').val();
        var speed = $('#speed').val();
    
        var $equipmentSelect = $('#equipment-select');
        $equipmentSelect.empty(); // Clear existing options
    
        for (var i = 0; i < equipmentTypes.length; i++) {
                var statDependency = equipmentTypes[i].statDependency;
                var shouldDisplay = false;
    
        if (statDependency === 'Strength' && strength >= 7) {
                shouldDisplay = true;
            } else if (statDependency === 'Precision' && precision >= 7) {
                shouldDisplay = true;
            } else if (statDependency === 'Intelligence' && intelligence >= 7) {
                shouldDisplay = true;
            } else if (statDependency === 'Speed' && speed >= 7) {
                shouldDisplay = true;
            } else if (statDependency === 'Vitality' && vitality >= 7) {
                shouldDisplay = true;
            }
    
            if (shouldDisplay) {
                $equipmentSelect.append('<option value="' + equipmentTypes[i].name + '">' + equipmentTypes[i].name + '</option>');
            }
        }
    }
    function populateGrades(selector) {
        $(selector).each(function() {
            if ($(this).children().length == 0) {
                for (var i = 0; i < grades.length; i++) {
                    $(this).append('<option value="' + gradeValues[i] + '">' + grades[i] + '</option>');
                }
            }
        });
    }

    function populateGrades3(selector, relevantStatValue, customGradeValues, skillName) {
        var relevantStatUpgrades = relevantStatValue / 7;
        $(selector).each(function() {
            if ($(this).children().length == 0) {
                // hard coded for specific exceptions
                if (skillName === 'Flight' || skillName === 'Always Outnumbered' || skillName === 'Villainous') {
                    for (var i = 0; i < relevantStatUpgrades - 2; i++) {
                        $(this).append('<option value="' + customGradeValues[i] + '">' + grades[i] + '</option>');
                    }
                } else if (skillName === 'Attentive Student' || skillName === 'Appraisal (Isekai)' || skillName === 'Appraisal (Native)' || skillName === 'Minions' || skillName === 'Area Knowledge (Native)' || skillName === 'Componentless Magic' || skillName === 'Narrative Booster' || skillName === 'Tamer' || skillName === 'Tamer Breeding' || skillName === 'Tamer Buddy Awakening' || skillName === 'Tamer Buddy Maintenance' || skillName === 'Tamer Element Training' || skillName === 'Tamer Merging' || skillName === 'Tamer Skill Training' || skillName === 'Tamer Stat Training' || skillName === 'Builder' || skillName === 'Harvester') {
                    for (var i = 0; i < relevantStatUpgrades + 1; i++) {
                        $(this).append('<option value="' + customGradeValues[i] + '">' + grades[i] + '</option>');
                    }
                } else {
                    for (var i = 0; i < relevantStatUpgrades; i++) {
                        $(this).append('<option value="' + customGradeValues[i] + '">' + grades[i] + '</option>');
                    }
                }
            }
        });
    }

    function populateGrades2(selector, relevantStatValue) {
        var relevantStatUpgrades = relevantStatValue / 7;
        $(selector).each(function() {
            if ($(this).children().length == 0) {
                for (var i = 0; i < relevantStatUpgrades; i++) {
                    $(this).append('<option value="' + gradeValues[i] + '">' + grades[i] + '</option>');
                }
            }
        });
    }

    function addFightingStyleHeader() {
        var $header = $('<div class="fighting-style-header"><input type="text" placeholder="Enter style name"> fighting style (SP): </div>');
        var $dropdownContainer = $('<div class="technique-container">Techniques: <select class="technique-select"><option value="Accurate">Accurate</option><option value="Area">Area</option><option value="Aura">Aura</option><option value="Blight">Blight</option><option value="Blind Fighter">Blind Fighter</option><option value="Blind Ranged Fighting">Blind Ranged Fighting</option><option value="Contact">Contact</option><option value="Contagion">Contagion</option><option value="Continuing">Continuing</option><option value="Deflect">Deflect</option><option value="Drain">Drain</option><option value="Enervation">Enervation</option><option value="Flare">Flare</option><option value="Flexible">Flexible</option><option value="Homing">Homing</option><option value="Hot Shot">Hot Shot</option><option value="Incapacitating">Incapacitating</option><option value="Incurable">Incurable</option><option value="Indirect">Indirect</option><option value="Irritant">Irritant</option><option value="Knockback">Knockback</option><option value="Linked">Linked</option><option value="Vorpal">Vorpal</option><option value="Non-Lethal">Non-Lethal</option><option value="Penetrating">Penetrating</option><option value="Quake">Quake</option><option value="Range">Range</option><option value="Reach">Reach</option><option value="Reflect">Reflect</option><option value="Selective">Selective</option><option value="Spreading">Spreading</option><option value="Tangle">Tangle</option><option value="Trap">Trap</option><option value="Vampiric">Vampiric</option></select><button class="add-technique">Add</button><div class="technique-list"></div></div>');

        $('#fighting-style-container').append($header);
        $('#fighting-style-container').append($dropdownContainer);

        $dropdownContainer.find('.add-technique').click(function() {
            var technique = $(this).siblings('.technique-select').val();
            var $techniqueList = $(this).siblings('.technique-list');

            $techniqueList.append('<div class="technique-item" data-technique="' + technique + '">' + technique + ' <button class="remove-technique">&times;</button></div>');
            calculatePoints();

            $('.remove-technique').click(function() {
                $(this).parent().remove();
                calculatePoints();
            });
        });
    }

    function addFightingStyleHeader2() {
        var $header = $('<div class="fighting-style-header"><input type="text" placeholder="Enter style name"> fighting style: </div>');
        var $dropdownContainer = $('<div class="technique-container">Techniques: <select class="technique-select"><option value="Accurate">Accurate</option><option value="Area">Area</option><option value="Aura">Aura</option><option value="Blight">Blight</option><option value="Blind Fighter">Blind Fighter</option><option value="Blind Ranged Fighting">Blind Ranged Fighting</option><option value="Contact">Contact</option><option value="Contagion">Contagion</option><option value="Continuing">Continuing</option><option value="Deflect">Deflect</option><option value="Drain">Drain</option><option value="Enervation">Enervation</option><option value="Flare">Flare</option><option value="Flexible">Flexible</option><option value="Homing">Homing</option><option value="Hot Shot">Hot Shot</option><option value="Incapacitating">Incapacitating</option><option value="Incurable">Incurable</option><option value="Indirect">Indirect</option><option value="Irritant">Irritant</option><option value="Knockback">Knockback</option><option value="Linked">Linked</option><option value="Vorpal">Vorpal</option><option value="Non-Lethal">Non-Lethal</option><option value="Penetrating">Penetrating</option><option value="Quake">Quake</option><option value="Range">Range</option><option value="Reach">Reach</option><option value="Reflect">Reflect</option><option value="Selective">Selective</option><option value="Spreading">Spreading</option><option value="Tangle">Tangle</option><option value="Trap">Trap</option><option value="Vampiric">Vampiric</option></select><button class="add-technique">Add</button><div class="technique-list"></div></div>');

        $('#fighting-style-container2').append($header);
        $('#fighting-style-container2').append($dropdownContainer);

        $dropdownContainer.find('.add-technique').click(function() {
            var technique = $(this).siblings('.technique-select').val();
            var $techniqueList = $(this).siblings('.technique-list');
            var gradeDropdown = $('<select class="technique-grade"></select>');
            populateGrades(gradeDropdown);      //change this for dropdown

            var $techniqueItem = $('<div class="technique-item2" data-technique="' + technique + '"></div>');
            $techniqueItem.append(technique + ' ').append(gradeDropdown).append(' <span class="technique-cost">' + techniqueCosts2[technique][0] + '</span> <input type="checkbox" class="technique-discount">' + "Discount" + '<button class="remove-button">&times;</button>');
            $techniqueList.append($techniqueItem);
            calculatePoints();

            gradeDropdown.change(function() {
                var selectedGradeIndex = $(this).prop('selectedIndex');
                var newPointCost = techniqueCosts2[technique][selectedGradeIndex];
                $(this).siblings('.technique-cost').text(newPointCost);
                calculatePoints();
            });

            $techniqueItem.find('.technique-discount').change(function() {
                calculatePoints();
            });

            $('.remove-button').click(function() {
                $(this).parent().remove();
                calculatePoints();
            });
        });
    }

    function removeFightingStyleHeaders() {
        $('.fighting-style-header, .technique-container').remove();
    }
    function removeFightingStyleTechniques() {
        $('.technique-item2').each(function() {
            $(this).remove();
        });
    }

    function updateSkillOptions() {
        var strength = $('#strength').val();
        var precision = $('#precision').val();
        var intelligence = $('#intelligence').val();
        var vitality = $('#vitality').val();
        var speed = $('#speed').val();
        var chgrade = $('#chgrade').val();
        var stgrade = $('#stgrade').val();
        var magic = $('#magic').val();
    
        var $skillSelect = $('#skill-select');
        $skillSelect.empty(); // Clear existing options
    
        for (var i = 0; i < skillTypes.length; i++) {
            var skill = skillTypes[i];
            var statDependency = skill.statDependency;
            var shouldDisplay = false;

            if (statDependency === 'Strength' && strength >= 7) {
                shouldDisplay = true;
            } else if (statDependency === 'Precision' && precision >= 7) {
                shouldDisplay = true;
            } else if (statDependency === 'Intelligence' && intelligence >= 7) {
                shouldDisplay = true;
            } else if (statDependency === 'Speed' && speed >= 7) {
                shouldDisplay = true;
            } else if (statDependency === 'Vitality' && vitality >= 7) {
                shouldDisplay = true;
            } else if (statDependency === 'ChGrade' && chgrade >= 7) {
                shouldDisplay = true;
            } else if (statDependency === 'StGrade' && stgrade >= 7) {
                shouldDisplay = true;
            } else if (statDependency === 'Magic' && magic >= 7) {
                shouldDisplay = true;
            } else if (statDependency === ' ') {
                shouldDisplay = true;
            } else if (statDependency === 'NULL') {
                shouldDisplay = true;
            }

            //hard coded for these exceptions
            if (skill.name === 'Flight' && precision >= 21) {
                shouldDisplay = true;
            } else if (skill.name === 'Flight' && precision < 21) {
                shouldDisplay = false;
            }

            if (skill.name === 'Always Outnumbered' && stgrade >= 21) {
                shouldDisplay = true;
            } else if (skill.name === 'Always Outnumbered' && stgrade < 21) {
                shouldDisplay = false;
            }

            if (skill.name === 'Villainous' && stgrade >= 21) {
                shouldDisplay = true;
            } else if (skill.name === 'Villainous' && stgrade < 21) {
                shouldDisplay = false;
            }

            if (skill.name === 'Appraisal (Isekai)' && stgrade >= 0) {
                shouldDisplay = true;
            } else if (skill.name === 'Appraisal (Isekai)' && stgrade < 0) {
                shouldDisplay = false;
            }

            if (skill.name === 'Builder' && stgrade >= 0) {
                shouldDisplay = true;
            } else if (skill.name === 'Builder' && stgrade < 0) {
                shouldDisplay = false;
            }

            if (skill.name === 'Harvester' && stgrade >= 0) {
                shouldDisplay = true;
            } else if (skill.name === 'Harvester' && stgrade < 0) {
                shouldDisplay = false;
            }

            if (skill.name === 'Minions' && stgrade >= 0) {
                shouldDisplay = true;
            } else if (skill.name === 'Minions' && stgrade < 0) {
                shouldDisplay = false;
            }

            if (skill.name === 'Appraisal (Native)' && stgrade >= 0) {
                shouldDisplay = true;
            } else if (skill.name === 'Appraisal (Native)' && stgrade < 0) {
                shouldDisplay = false;
            }

            if (skill.name === 'Area Knowledge (Native)' && stgrade >= 0) {
                shouldDisplay = true;
            } else if (skill.name === 'Area Knowledge (Native)' && stgrade < 0) {
                shouldDisplay = false;
            }

            if (skill.name === 'Attentive Student' && stgrade >= 0) {
                shouldDisplay = true;
            } else if (skill.name === 'Attentive Student' && stgrade < 0) {
                shouldDisplay = false;
            }

            if (skill.name === 'Narrative Booster' && stgrade >= 0) {
                shouldDisplay = true;
            } else if (skill.name === 'Narrative Booster' && stgrade < 0) {
                shouldDisplay = false;
            }

            
            if (skill.name === 'Tamer' && stgrade >= 0) {
                shouldDisplay = true;
            } else if (skill.name === 'Tamer' && stgrade < 0) {
                shouldDisplay = false;
            }

            
            if (skill.name === 'Tamer Breeding' && stgrade >= 0) {
                shouldDisplay = true;
            } else if (skill.name === 'Tamer Breeding' && stgrade < 0) {
                shouldDisplay = false;
            }

            
            if (skill.name === 'Tamer Buddy Awakening' && stgrade >= 0) {
                shouldDisplay = true;
            } else if (skill.name === 'Tamer Buddy Awakening' && stgrade < 0) {
                shouldDisplay = false;
            }

            
            if (skill.name === 'Tamer Buddy Maintenance' && stgrade >= 0) {
                shouldDisplay = true;
            } else if (skill.name === 'Tamer Buddy Maintenance' && stgrade < 0) {
                shouldDisplay = false;
            }

            
            if (skill.name === 'Tamer ELement Training' && stgrade >= 0) {
                shouldDisplay = true;
            } else if (skill.name === 'Tamer ELement Training' && stgrade < 0) {
                shouldDisplay = false;
            }

            
            if (skill.name === 'Tamer Merging' && stgrade >= 0) {
                shouldDisplay = true;
            } else if (skill.name === 'Tamer Merging' && stgrade < 0) {
                shouldDisplay = false;
            }

            
            if (skill.name === 'Tamer Skill Training' && stgrade >= 0) {
                shouldDisplay = true;
            } else if (skill.name === 'Tamer Skill Training' && stgrade < 0) {
                shouldDisplay = false;
            }

            
            if (skill.name === 'Tamer Stat Training' && stgrade >= 0) {
                shouldDisplay = true;
            } else if (skill.name === 'Tamer Stat Training' && stgrade < 0) {
                shouldDisplay = false;
            }

            if (skill.name === 'Componentless Magic' && magic >= 0) {
                shouldDisplay = true;
            } else if (skill.name === 'Componentless Magic' && magic < 0) {
                shouldDisplay = false;
            }
    
            if (shouldDisplay) {
                $skillSelect.append('<option value="' + skill.name + '">' + skill.name + '</option>');
            }
        }
    }

    function removeMagicSkills() {
    $('.skill-row').each(function() {
        var skillStatDependency = $(this).data('stat-dependency');
        if (skillStatDependency === 'Magic') {
            $(this).remove();
        }
    });
    }


    function calculateCharacterGrade() {
        // Calculate average of all stats
        var grades = ['F','E', 'D', 'C', 'B', 'A', 'S'];
        var totalStats = 0;
        $('.stat-grade').each(function() {
            totalStats += parseInt($(this).val());
        });
        var averageGrade = Math.floor(totalStats / 35);
        $('#hidden-character-grade').text(grades[averageGrade]);
        $('#chgrade').val(averageGrade * 7);
    }

    function calculateStandingGrade() {
        var grades = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
        var earnedPoints = parseInt($('#earned-points').val()) || 0; // Ensure input is a number
        var standingIndex = Math.min(Math.floor(earnedPoints / 100), grades.length - 1); // Cap index to the length of grades
        $('#hidden-standing-grade').text(grades[standingIndex]); // Update displayed grade
        $('#stgrade').val(standingIndex * 7);
    }

    // function to calculate points
function calculatePoints() {
    var points = 0;
    
    // add skill points
    $('.skill-grade').each(function() {
        points += parseInt($(this).val()) || 0;
    });
    // add stat points
    $('.stat-grade').each(function() {
        points += parseInt($(this).val()) || 0;
    });
    // add equipment points
    $('.equipment-cost').each(function() {
        points += parseInt($(this).text()) || 0;
    });
    // add custom points
    $('.custom-price').each(function() {
        points += parseInt($(this).val()) || 0;
    });

    // Add points for techniques
    $('.technique-item').each(function() {
        var technique = $(this).data('technique');
        points += techniqueCosts[technique] || 0;
    });

    $('.technique-item2').each(function() {
        var technique = $(this).data('technique');
        var gradeIndex = $(this).find('.technique-grade').prop('selectedIndex');
        var baseCost = techniqueCosts2[technique][gradeIndex] || 0;
        var discount = $(this).find('.technique-discount').is(':checked') ? 7 : 0;
        points += (baseCost - discount);
    });


    // update points
    $('#point-value').text(points);
    var earnedpoints = (parseInt($('#earned-points').val()) || 0);

    // Add points from earned points checkboxes
    if ($('#born-for-this').is(':checked')) {
        earnedpoints += 7;
    }
    if ($('#cashback').is(':checked')) {
        earnedpoints += 28;
    }

    // Include the companion grade cost
    if ($('#companion').is(':checked')) {
        earnedpoints += parseInt($('#companion-grade').val());
    }

    if ($('#minion').is(':checked')) {
        earnedpoints -= 49;
    }

        // Total allowed points
        var totalAllowedPoints = 105 + earnedpoints;

        // Calculate remaining points
        var pointRemaining = totalAllowedPoints - points;
      
        // Update "Points remaining"
        $('#point-remaining').text(pointRemaining);

    // check if over limit
    if (points > (105+earnedpoints)) {
        //$('#points').css('color', 'red');
        alert('Points exceed limit!')
    } else {
       // $('#points').css('color', '#ddd');
    }

}

});


function updateEquipmentCost(equipmentRow) {
    var gradeValue = parseInt(equipmentRow.find('.equipment-grade').val()) || 0;
    var cost = gradeValue;

    // Double the cost for each checked checkbox
    equipmentRow.find('.equipment-option').each(function() {
        if ($(this).is(':checked')) {
            cost *= 2;
        }
    });

    equipmentRow.find('.equipment-cost').text(cost);
}

document.getElementById("toggle-theme-button").addEventListener("click", function () {
    const body = document.body;

    // Check the current background color
    if (body.style.backgroundColor === "white") {
        // Switch to dark mode
        body.style.backgroundColor = "#313338";
        body.style.color = "#ddd";
    } else {
        // Switch to light mode
        body.style.backgroundColor = "white";
        body.style.color = "black";
    }
});
