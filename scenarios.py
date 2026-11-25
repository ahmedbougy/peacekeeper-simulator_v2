# Each choice: (style_key, label, text, points)
# style_key: "aggressive" | "avoidant" | "calm"

SCENARIOS = [
    {
        "title": "The Vanishing Slides",
        "badge": "Classroom & Teamwork",
        "text": "Five minutes before your group presentation, half of the slides are missing and two teammates immediately start pointing fingers at each other in front of the class.",
        "choices": [
            ("aggressive", "Blame & Escalate", "Announce loudly who forgot their part so everyone knows it wasn't your fault.", 0),
            ("avoidant", "Check Out", "Shrug, stare at the floor, and let the timer run out silently.", 1),
            ("calm", "Calm Pivot", "Pause the argument, outline the main points on the board, and divide a quick rescue plan.", 3),
        ],
    },
    {
        "title": "The Last Slice Treaty",
        "badge": "Friends & Snacks · Comedy",
        "text": "There is one slice of pizza left on the table, and two friends stare at it like it is a rare museum artifact—both claiming they 'called dibs' two hours ago via telepathy.",
        "choices": [
            ("aggressive", "Dramatic Duel", "Challenge them to a high-stakes rock-paper-scissors showdown with zero mercy.", 0),
            ("avoidant", "Sneaky Escape", "Pretend you're already full while secretly plotting to grab it when they blink.", 1),
            ("calm", "Peaceful Split", "Suggest splitting it in half—or letting the hungriest person take it in exchange for doing dish duty.", 3),
        ],
    },
    {
        "title": "Bass vs. Focus",
        "badge": "Shared Space",
        "text": "One person in a shared room is blasting upbeat music while prepping for a big task, and another desperately needs quiet to concentrate.",
        "choices": [
            ("aggressive", "Volume War", "Turn the volume up even higher to prove your point.", 0),
            ("avoidant", "Silent Resentment", "Say nothing, suffer in silence, and complain to everyone else later.", 1),
            ("calm", "Fair Compromise", "Switch to headphones or agree on a clear quiet-hour block so both needs are met.", 3),
        ],
    },
    {
        "title": "The Ghost in the Queue",
        "badge": "Cafeteria Line · Comedy",
        "text": "A friend steps into the front of a long lunch line claiming, 'I was standing here ten minutes ago, I just went to think about my life,' sparking immediate outrage behind them.",
        "choices": [
            ("aggressive", "Defend at All Costs", "Argue with the entire line that philosophical thinking counts as holding a spot.", 0),
            ("avoidant", "Awkward Blend-In", "Act like you don't know them and examine the ceiling tiles.", 1),
            ("calm", "Diplomatic Reset", "Apologize to the people waiting, step back into place, and laugh off the 'philosophical detour.'", 3),
        ],
    },
    {
        "title": "Lag or Bad Tactics?",
        "badge": "Gaming & Online",
        "text": "Your squad loses a match in the final seconds, and teammates start roasting each other's aim, ping, and life choices in voice chat.",
        "choices": [
            ("aggressive", "Full Roast Mode", "Fire back with insults and threaten to quit the team right now.", 0),
            ("avoidant", "Rage Mute", "Mute everyone without a word and leave the call.", 1),
            ("calm", "Cool Debrief", "Joke about the chaotic ending, cool down the chat, and pick one simple fix for the next round.", 3),
        ],
    },
    {
        "title": "The Joke That Crickets Loved",
        "badge": "Friends & Hangouts · Comedy",
        "text": "A friend tells a painfully long, heavy joke with total confidence, and after seconds of dead silence, some people start mocking it while others groan about wasting time.",
        "choices": [
            ("aggressive", "Join the Roast", "Side with the mockers and say, 'I think the punchline got lost in traffic and never made it here.'", 0),
            ("avoidant", "Phone Escape", "Shift your seat or stare at your phone as if you didn't hear a thing.", 1),
            ("calm", "Smooth Pivot", "Lighten the mood kindly without embarrassing the storyteller, then steer the group into a fun topic everyone enjoys.", 3),
        ],
    },
    {
        "title": "Budget vs. Big Ideas",
        "badge": "School Club / Project",
        "text": "Your club wants to host a memorable event, but half the team wants an ambitious setup while the other half insists on staying strictly within a tight budget.",
        "choices": [
            ("aggressive", "All-or-Nothing", "Insist on your vision and refuse to budge even a little.", 0),
            ("avoidant", "Give Up", "Say 'Fine, do whatever' and stop contributing ideas.", 1),
            ("calm", "Smart Trade-Off", "Compare costs side by side and keep the highest-impact idea within budget.", 3),
        ],
    },
    {
        "title": "The Squeaky Chair Symphony",
        "badge": "Quiet Study Zone · Comedy",
        "text": "In a dead-quiet study room, someone's chair squeaks every four seconds like a distressed seagull, and people nearby are expressing anger through dramatic sighs and aggressive pen clicks.",
        "choices": [
            ("aggressive", "Passive-Aggressive Snap", "Slam your book shut and glare across the room.", 0),
            ("avoidant", "Endure the Seagull", "Stay put and let the squeaks slowly test your sanity.", 1),
            ("calm", "Whispered Solution", "Quietly offer to swap chairs or move to a spot where both of you can work comfortably.", 3),
        ],
    },
    {
        "title": "The Disputed Call",
        "badge": "Friendly Match",
        "text": "During a casual game, a close call goes against one side, and tempers flare over whether the ball was in or out.",
        "choices": [
            ("aggressive", "Hot Head", "Push for a confrontation and refuse to keep playing unless everyone agrees with you.", 0),
            ("avoidant", "Storm Off", "Walk off the court/field in frustration without talking it through.", 1),
            ("calm", "Fair Play", "Suggest a quick fair redo or a neutral call so the game stays fun and respectful.", 3),
        ],
    },
    {
        "title": "Two Towns, One River",
        "badge": "Shared Resource Dispute",
        "text": "Two neighboring communities depend on the same seasonal river. During a dry spell, distrust grows and each side blames the other for taking more than its fair share.",
        "choices": [
            ("aggressive", "Escalation", "Back restrictive blockades and aggressive retaliation.", 0),
            ("avoidant", "Avoidance", "Ignore the warning signs until the shortage becomes a full crisis.", 1),
            ("calm", "Joint Agreement", "Bring representatives together to share transparent data and set fair rotation rules.", 3),
        ],
    },
]

# Quick Demo uses 5 varied scenarios (indexes into SCENARIOS)
QUICK_INDEXES = [0, 1, 4, 8, 9]

RANKS = [
    {
        "min": 0, "max": 10,
        "name": "Accidental Flame-Starter",
        "badge": "High Drama Alert",
        "quote": "Between stimulus and response there is a space. In that space is our power to choose our response.",
        "feedback": "You react fast and with passion, and sometimes the fire spreads before you notice the match in your hand. Try pausing for three seconds before responding. That tiny gap can turn a blow-up into a conversation.",
    },
    {
        "min": 11, "max": 20,
        "name": "Borderline Diplomat",
        "badge": "Cautious Observer",
        "quote": "Peace is not merely a distant goal that we seek, but a means by which we arrive at that goal.",
        "feedback": "You usually avoid the worst, but sometimes you let tension simmer instead of addressing it. You already have the instincts of a mediator. Next time, step in with one calm question instead of stepping back.",
    },
    {
        "min": 21, "max": 30,
        "name": "Master Peacekeeper",
        "badge": "Balanced Mediator",
        "quote": "Peace cannot be kept by force; it can only be achieved by understanding.",
        "feedback": "You listen first, cool things down, and look for solutions that work for everyone. People around you feel safe to speak, and that is the real superpower of a peacekeeper.",
    },
]


def get_rank(score_out_of_30):
    for r in RANKS:
        if r["min"] <= score_out_of_30 <= r["max"]:
            return r
    return RANKS[-1]