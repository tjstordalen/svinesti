// names.gs - Word lists and name generation
// Shared across the Apps Script project

var ADJECTIVES = [
    'great', 'long', 'high', 'little', 'old', 'small', 'young', 'short', 'deep', 'wide',
    'big', 'poor', 'hard', 'ready', 'heavy', 'cold', 'dry', 'fast', 'dark', 'happy',
    'strange', 'perfect', 'blue', 'green', 'powerful', 'broad', 'rich', 'fair', 'pure', 'slow',
    'hot', 'plain', 'warm', 'dear', 'clean', 'weak', 'fresh', 'wild', 'safe', 'thin',
    'soft', 'cool', 'vast', 'pretty', 'bright', 'flat', 'rare', 'thick', 'quick', 'quiet',
    'empty', 'sweet', 'sharp', 'royal', 'brown', 'wise', 'silent', 'glad', 'odd', 'pale',
    'proud', 'calm', 'alive', 'grand', 'lean', 'tall', 'rough', 'healthy', 'busy', 'steady',
    'wet', 'loose', 'nice', 'raw', 'honest', 'angry', 'strict', 'sad', 'loud', 'sorry',
    'cheap', 'bitter', 'bare', 'gentle', 'golden', 'wooden', 'mild', 'tiny', 'bent', 'humble',
    'mighty', 'brave', 'fatal', 'tight', 'bold', 'magic', 'dull', 'rigid', 'eager', 'mad',
    'gray', 'grey', 'curious', 'remote', 'pleasant', 'harsh', 'stern', 'vivid', 'dim', 'smart',
    'lofty', 'elegant', 'urgent', 'clever', 'foolish', 'stupid', 'purple', 'pink', 'sandy', 'idle',
    'drunk', 'loyal', 'awful', 'sincere', 'fierce', 'tough', 'sheer', 'lucky', 'modest', 'cruel',
    'tropical', 'subtle', 'dual', 'tense', 'comic', 'toxic', 'fertile', 'awake', 'keen', 'solemn',
    'polite', 'awkward', 'gloomy', 'gracious', 'vicious', 'rocky', 'moist', 'arid', 'barren', 'brutal',
    'stout', 'merry', 'uneasy', 'grim', 'robust', 'dumb', 'naive', 'frank', 'blunt', 'fiery',
    'noisy', 'tame', 'lazy', 'fragile', 'sunny', 'dire', 'hasty', 'bony', 'meager', 'sleepy',
    'slim', 'nasty', 'frail', 'weird', 'lone', 'dubious', 'vile', 'sturdy', 'morbid', 'reckless',
    'slack', 'dusty', 'muddy', 'risky', 'hardy', 'hideous', 'chaotic', 'dreary', 'stormy', 'fuzzy',
    'bizarre', 'bald', 'rotten', 'clumsy', 'lethal', 'sparse', 'greedy', 'rustic', 'scant', 'bland',
    'rosy', 'icy', 'watery', 'woody', 'crisp', 'candid', 'brisk', 'watchful', 'stale', 'sticky',
    'playful', 'cloudy', 'stony', 'hairy', 'humid', 'shabby', 'lucid', 'tidy', 'shady', 'ongoing',
    'cunning', 'pending', 'upcoming', 'sacred', 'naked', 'skilled', 'beloved', 'wicked', 'ashamed',
    'renowned', 'talented'
];

var NOUNS = [
    'water', 'tree', 'animal', 'boy', 'girl', 'food', 'door', 'wall', 'ground', 'air',
    'sea', 'horse', 'stone', 'river', 'wood', 'mountain', 'gold', 'sun', 'island', 'path',
    'summer', 'box', 'metal', 'leaf', 'fish', 'farm', 'game', 'soil', 'hair', 'root',
    'iron', 'bird', 'dog', 'spot', 'boat', 'camp', 'star', 'forest', 'hill', 'flower',
    'garden', 'fruit', 'winter', 'east', 'west', 'coast', 'pool', 'lake', 'ocean', 'rain',
    'snow', 'storm', 'cloud', 'moon', 'sky', 'ice', 'sand', 'stream', 'valley', 'shadow',
    'acre', 'grass', 'gate', 'bridge', 'den', 'egg', 'corn', 'milk', 'tea', 'bread',
    'meat', 'wine', 'salt', 'grain', 'sugar', 'cup', 'meal', 'coffee', 'trail', 'beast',
    'pig', 'silk', 'dawn', 'cave', 'nest', 'cliff', 'web', 'sage', 'tomb', 'pond',
    'hay', 'rice', 'nun', 'tin', 'fort', 'ash', 'pine', 'bat', 'vine', 'pot',
    'oak', 'bee', 'nut', 'mud', 'barn', 'deer', 'duck', 'goat', 'sheep', 'cow',
    'lion', 'lamb', 'calf', 'ant', 'wolf', 'snake', 'worm', 'monkey', 'mouse', 'rat',
    'fox', 'rabbit', 'chicken', 'creek', 'canyon', 'meadow', 'grove', 'jungle', 'trunk', 'branch',
    'bud', 'bloom', 'thorn', 'seed', 'cone', 'shell', 'coral', 'pearl', 'gem', 'jewel',
    'glow', 'flame', 'blaze', 'spark', 'mist', 'fog', 'frost', 'dew', 'tide', 'wave',
    'gulf', 'bay', 'cape', 'isle', 'reef', 'shore', 'wharf', 'dock', 'pier', 'harbor',
    'tower', 'castle', 'hut', 'cabin', 'inn', 'tent', 'vault', 'dome', 'arch', 'spire',
    'pillar', 'column', 'beam', 'plank', 'brick', 'tile', 'slab', 'pane', 'panel', 'mat',
    'rug', 'carpet', 'pad', 'roast', 'ranch', 'pie', 'mole', 'yeast', 'eagle', 'shrub',
    'bucket', 'camel', 'batch', 'comb', 'buffalo', 'hen', 'marsh', 'onion', 'jam', 'dairy',
    'cafe', 'rocket', 'coffin', 'torch', 'salmon', 'flask', 'towel', 'pea', 'cube', 'tiger',
    'goose', 'dragon', 'fowl', 'hood', 'yarn', 'staple', 'tennis', 'trout', 'butt', 'bait',
    'groom', 'villa', 'inlet', 'cradle', 'tar', 'banana', 'bass', 'spoon', 'toast', 'hound',
    'radar', 'lemon', 'medal', 'tab', 'taxi', 'sofa', 'helmet', 'pigeon', 'sauce', 'tractor',
    'gall', 'tub', 'hawk', 'mare', 'chick', 'kit', 'rust', 'lance', 'gale', 'swan',
    'crab', 'dusk', 'hose', 'puppet', 'twig', 'mint', 'turkey', 'sap', 'din', 'gorge',
    'turtle', 'pub', 'lore', 'rum', 'moth', 'crane', 'maze', 'pear', 'badge', 'hamlet',
    'rainbow', 'yacht', 'harp', 'fern', 'shark', 'jack', 'owl', 'ham', 'sock', 'iris',
    'cricket', 'cedar', 'kettle', 'sunrise', 'dice', 'abbey', 'dough', 'bike', 'paw', 'coconut',
    'cosmos', 'trash', 'brim', 'swine', 'spade', 'rodent', 'brink', 'gill', 'jug', 'nap',
    'beaver', 'puppy', 'slag', 'hoe', 'razor', 'gutter', 'elm', 'pedal', 'lotus', 'tattoo',
    'grit', 'fir', 'slumber', 'guild', 'trot', 'raft', 'nave', 'moor', 'gym', 'mop',
    'butler', 'tot', 'slug', 'bum', 'wasp', 'vat', 'dime', 'tram', 'stub', 'nook',
    'lute', 'lark', 'bower', 'crag', 'orb', 'yam', 'glen', 'elk', 'cub', 'pup',
    'mango', 'ember', 'guru', 'hemp', 'malt', 'trek', 'karma', 'zoo', 'atlas', 'ivy',
    'sod', 'mane', 'melon', 'troupe', 'casino', 'axle', 'hive', 'swap', 'raven', 'baker',
    'poker', 'gull', 'ford', 'knob', 'maple', 'chunk', 'plum', 'beet', 'jade', 'chef',
    'buff', 'cod', 'hub', 'chess', 'junk', 'ace', 'ruby', 'ark', 'pal', 'gag',
    'tee', 'ode', 'sol', 'mug', 'pod', 'spring', 'king', 'ring', 'wing', 'string',
    'swing', 'shilling', 'blessing', 'dwelling', 'evening', 'bearing', 'hearing', 'warning', 'heading',
    'seedling', 'stocking', 'ending', 'coating', 'herring', 'pudding', 'ceiling', 'greeting', 'cutting',
    'winding', 'fitting', 'ruling', 'casting', 'landing', 'dressing', 'crossing', 'wedding', 'listing',
    'outing', 'earring', 'bed', 'seed', 'deed', 'breed', 'shed', 'creed', 'weed', 'reed',
    'greed', 'steed', 'sled', 'city', 'motion', 'unity', 'option', 'segment', 'pity', 'equity',
    'cement', 'purity', 'deity', 'ration', 'vanity', 'pigment', 'clarity', 'fitness', 'madness',
    'sadness', 'harness'
];

var VERBS = [
    'racing', 'dashing', 'rushing', 'roaming', 'rolling', 'running', 'jumping', 'hopping', 'leaping', 'sliding',
    'gliding', 'flying', 'soaring', 'drifting', 'dancing', 'prancing', 'bouncing', 'spinning', 'twirling', 'whirling',
    'charging', 'darting', 'bolting', 'zooming', 'zipping', 'trotting', 'jogging', 'strolling', 'marching', 'hiking',
    'trailing', 'tracking', 'seeking', 'hunting', 'chasing', 'dodging', 'weaving', 'winding', 'snaking', 'looping',
    'climbing', 'rising', 'sinking', 'digging', 'burrowing', 'rooting', 'poking', 'prodding', 'nudging', 'pushing',
    'pulling', 'tugging', 'shoving', 'tumbling', 'flopping', 'flipping', 'twisting', 'turning', 'bending', 'curving',
    'arcing', 'circling', 'orbiting', 'swirling', 'spiraling', 'flowing', 'floating', 'bobbing', 'rocking', 'swaying',
    'tilting', 'tipping', 'leaning', 'wobbling', 'shaking', 'quaking', 'trembling', 'shivering', 'wiggling', 'jiggling',
    'buzzing', 'humming', 'ringing', 'chiming', 'singing', 'chirping', 'peeping', 'squeaking', 'clicking', 'tapping',
    'rapping', 'banging', 'booming', 'roaring', 'howling', 'growling', 'snarling', 'hissing', 'yowling', 'wailing',
    'moaning', 'groaning', 'sighing', 'puffing', 'huffing', 'panting', 'gasping', 'wheezing', 'snoring', 'sniffing',
    'snorting', 'nibbling', 'munching', 'chomping', 'gulping', 'slurping', 'sipping', 'lapping', 'licking', 'tasting',
    'smelling', 'peeking', 'spying', 'scouting', 'watching', 'gazing', 'staring', 'glancing', 'winking', 'blinking',
    'beaming', 'glowing', 'shining', 'gleaming', 'sparkling', 'glittering', 'twinkling', 'dimming', 'fading', 'paling',
    'blushing', 'blooming', 'budding', 'growing', 'sprouting', 'swelling', 'bulging', 'bursting', 'popping', 'cracking',
    'snapping', 'breaking', 'splitting', 'ripping', 'tearing', 'shredding', 'cutting', 'slicing', 'chopping', 'hacking',
    'carving', 'scooping', 'scraping', 'scratching', 'clawing', 'gripping', 'grasping', 'clutching', 'holding', 'hugging',
    'squeezing', 'pinching', 'jabbing', 'stabbing', 'piercing', 'pricking', 'stinging', 'biting', 'nipping', 'gnawing',
    'chewing', 'crunching', 'grinding', 'mashing', 'smashing', 'crushing', 'pounding', 'hammering', 'thumping', 'bumping',
    'ramming', 'bashing', 'crashing', 'smacking', 'slapping', 'swatting', 'batting', 'hitting', 'striking', 'whacking',
    'thwacking', 'boxing', 'kicking', 'booting', 'stomping', 'stamping', 'tramping', 'trudging', 'plodding', 'slogging',
    'slugging', 'dragging', 'hauling', 'lugging', 'towing', 'yanking', 'jerking'
];

function generateLevelName() {
    var patterns = [
        [ADJECTIVES, NOUNS],
        [NOUNS, NOUNS],
        [VERBS, NOUNS]
    ];

    var pattern = patterns[Math.floor(Math.random() * patterns.length)];
    var word1 = pattern[0][Math.floor(Math.random() * pattern[0].length)];
    var word2 = pattern[1][Math.floor(Math.random() * pattern[1].length)];

    var capitalize = function(s) { return s.charAt(0).toUpperCase() + s.slice(1); };
    return capitalize(word1) + ' ' + capitalize(word2);
}

function isValidLevelName(name) {
    if (typeof name !== 'string') return false;
    var words = name.split(' ');
    if (words.length !== 2) return false;

    var word1 = words[0].toLowerCase();
    var word2 = words[1].toLowerCase();

    var allWords = ADJECTIVES.concat(NOUNS).concat(VERBS);
    return allWords.indexOf(word1) !== -1 && allWords.indexOf(word2) !== -1;
}

