// German first name gender detection
// Returns 'f' (female), 'm' (male), or 'u' (unknown)

const FEMALE_NAMES = new Set([
  'ada', 'adelheid', 'agnes', 'alexandra', 'alice', 'alina', 'amelie', 'andrea', 'angela', 'angelika',
  'anja', 'anna', 'annalena', 'anne', 'annegret', 'anneliese', 'annemarie', 'annett', 'annette', 'antje',
  'astrid', 'barbara', 'beate', 'beatrice', 'beatrix', 'bella', 'bettina', 'bianca', 'birgit', 'birte',
  'brigitte', 'britta', 'carla', 'carmen', 'caroline', 'carina', 'cathrin', 'charlotte', 'christa',
  'christiane', 'christina', 'christine', 'clara', 'claudia', 'constanze', 'corinna', 'cornelia',
  'dagmar', 'daniela', 'diana', 'doreen', 'doris', 'dorothea', 'dorothee', 'edith', 'elena', 'elfriede',
  'elisabeth', 'elke', 'ella', 'ellen', 'elsa', 'emilia', 'emily', 'emma', 'erika', 'erna', 'esther',
  'eva', 'evelyn', 'fabienne', 'felicitas', 'franziska', 'frauke', 'frederike', 'frieda', 'friederike',
  'gabriele', 'gerda', 'gerlinde', 'gertrud', 'gisela', 'gudrun', 'hanna', 'hannah', 'hannelore',
  'heide', 'heidi', 'heike', 'helen', 'helena', 'helene', 'helga', 'henriette', 'herta', 'hilde',
  'hildegard', 'ines', 'inga', 'ingeborg', 'ingrid', 'irene', 'iris', 'irma', 'isabella', 'isolde',
  'jana', 'janina', 'jasmin', 'jennifer', 'jenny', 'jessica', 'johanna', 'josefine', 'judith', 'julia',
  'juliane', 'julie', 'jutta', 'karin', 'karla', 'karoline', 'katarina', 'katharina', 'kathrin',
  'katja', 'kerstin', 'klara', 'kristin', 'kristina', 'larissa', 'laura', 'lea', 'lena', 'leonie',
  'lieselotte', 'lilli', 'linda', 'lisa', 'lore', 'lotte', 'louise', 'lucia', 'luise', 'lydia',
  'madeleine', 'manuela', 'margarete', 'margarethe', 'margit', 'margot', 'maria', 'marianne', 'marie',
  'marina', 'marion', 'marlene', 'marlies', 'marta', 'martha', 'martina', 'mathilde', 'mechthild',
  'melanie', 'meike', 'mia', 'michaela', 'michelle', 'mina', 'miriam', 'monika', 'nadine', 'nadja',
  'natalie', 'nathalie', 'nicole', 'nina', 'nora', 'olga', 'patricia', 'paula', 'pauline', 'petra',
  'pia', 'ramona', 'rebecca', 'regina', 'renate', 'rita', 'rosa', 'rosemarie', 'roswitha', 'ruth',
  'sabine', 'sabrina', 'sandra', 'sara', 'sarah', 'silke', 'silvia', 'simone', 'sofia', 'sofie',
  'sonja', 'sophia', 'sophie', 'stefanie', 'stephanie', 'susanne', 'svenja', 'sylvia', 'tamara',
  'tanja', 'tatjana', 'teresa', 'theresa', 'theresia', 'tina', 'ulrike', 'ursula', 'ute', 'valentina',
  'vanessa', 'vera', 'verena', 'veronika', 'victoria', 'viktoria', 'waltraud', 'wendy', 'wiebke',
  'yvonne', 'zoe',
]);

const MALE_NAMES = new Set([
  'achim', 'adam', 'adrian', 'albrecht', 'alexander', 'alfred', 'andreas', 'andre', 'anton', 'armin',
  'arno', 'arnold', 'arthur', 'axel', 'benjamin', 'bernd', 'bernhard', 'björn', 'boris', 'bruno',
  'carl', 'carsten', 'christian', 'christoph', 'christopher', 'claus', 'clemens', 'daniel', 'david',
  'dennis', 'detlef', 'dieter', 'dietmar', 'dietrich', 'dirk', 'dominik', 'eckhard', 'edgar', 'edmund',
  'eduard', 'egon', 'elias', 'emil', 'erich', 'erik', 'ernst', 'erwin', 'eugen', 'fabian', 'felix',
  'ferdinand', 'finn', 'florian', 'frank', 'franz', 'frederic', 'frederik', 'friedhelm', 'friedrich',
  'fritz', 'georg', 'gerald', 'gerhard', 'gerd', 'gert', 'gregor', 'guido', 'günter', 'günther',
  'gustav', 'hans', 'harald', 'harry', 'hartmut', 'heiko', 'heinrich', 'heinz', 'helmut', 'hendrik',
  'henning', 'henry', 'herbert', 'hermann', 'holger', 'horst', 'hubert', 'hugo', 'ingo', 'jakob',
  'jan', 'jens', 'joachim', 'jochen', 'johann', 'johannes', 'jonas', 'jonathan', 'jörg', 'josef',
  'jürgen', 'kai', 'karl', 'karsten', 'kaspar', 'kevin', 'klaus', 'konrad', 'konstantin', 'kurt',
  'lars', 'leon', 'leonhard', 'lothar', 'louis', 'luca', 'lucas', 'ludwig', 'lukas', 'lutz',
  'manfred', 'manuel', 'marc', 'marcel', 'marco', 'marcus', 'mario', 'marius', 'mark', 'markus',
  'martin', 'mathias', 'matthias', 'max', 'maximilian', 'michael', 'moritz', 'nico', 'nicolai',
  'niklas', 'nikolai', 'nikolaus', 'norbert', 'oliver', 'oskar', 'otto', 'pascal', 'patrick', 'paul',
  'peter', 'philipp', 'rainer', 'ralf', 'raphael', 'reinhard', 'reinhold', 'richard', 'robert',
  'robin', 'roland', 'rolf', 'roman', 'rudolf', 'rüdiger', 'sascha', 'sebastian', 'siegfried',
  'simon', 'stefan', 'steffen', 'stephan', 'sven', 'swen', 'theo', 'theodor', 'thomas', 'thorsten',
  'till', 'tilman', 'tim', 'timo', 'tobias', 'tom', 'torsten', 'uwe', 'valentin', 'volker', 'walter',
  'werner', 'wilfried', 'wilhelm', 'willi', 'winfried', 'wolf', 'wolfgang', 'zacharias',
]);

export type Gender = 'f' | 'm' | 'u';

export function detectGender(firstName: string | null): Gender {
  if (!firstName) return 'u';
  const normalized = firstName.toLowerCase().trim().split(/[\s\-]/)[0]; // Take first part of compound names
  if (FEMALE_NAMES.has(normalized)) return 'f';
  if (MALE_NAMES.has(normalized)) return 'm';
  return 'u';
}

export function formatSalutation(firstName: string | null, lastName: string | null): string {
  if (!lastName) return 'Guten Tag,';
  const gender = detectGender(firstName);
  switch (gender) {
    case 'f': return `Sehr geehrte Frau ${lastName},`;
    case 'm': return `Sehr geehrter Herr ${lastName},`;
    default: return `Guten Tag ${lastName},`;
  }
}
