// parse.js — a fast CommonMark 0.31.2 + GFM 0.29 renderer, written from scratch
// for the make.fun markdown-render-speed-02 competition. parse(markdown) returns
// exactly the HTML that marked 18.1.3 renders with its default options
// (gfm: true, breaks: false, pedantic: false, async: false).
//
// Design: a line-based block parser producing a small node tree (link reference
// definitions are collected during the block pass, so forward references work),
// then an inline parser built on the CommonMark delimiter-stack algorithm.
// No regular expressions in the hot paths: scanning is done with charCodeAt /
// indexOf and precomputed tables, and output is assembled from string parts.

// HTML5 named entities (name without ';' -> character). Data table only.
const ENT = JSON.parse("{\"Aacute\":\"Á\",\"aacute\":\"á\",\"Abreve\":\"Ă\",\"abreve\":\"ă\",\"ac\":\"∾\",\"acd\":\"∿\",\"acE\":\"∾̳\",\"Acirc\":\"Â\",\"acirc\":\"â\",\"acute\":\"´\",\"Acy\":\"А\",\"acy\":\"а\",\"AElig\":\"Æ\",\"aelig\":\"æ\",\"af\":\"⁡\",\"Afr\":\"𝔄\",\"afr\":\"𝔞\",\"Agrave\":\"À\",\"agrave\":\"à\",\"alefsym\":\"ℵ\",\"aleph\":\"ℵ\",\"Alpha\":\"Α\",\"alpha\":\"α\",\"Amacr\":\"Ā\",\"amacr\":\"ā\",\"amalg\":\"⨿\",\"AMP\":\"&\",\"amp\":\"&\",\"And\":\"⩓\",\"and\":\"∧\",\"andand\":\"⩕\",\"andd\":\"⩜\",\"andslope\":\"⩘\",\"andv\":\"⩚\",\"ang\":\"∠\",\"ange\":\"⦤\",\"angle\":\"∠\",\"angmsd\":\"∡\",\"angmsdaa\":\"⦨\",\"angmsdab\":\"⦩\",\"angmsdac\":\"⦪\",\"angmsdad\":\"⦫\",\"angmsdae\":\"⦬\",\"angmsdaf\":\"⦭\",\"angmsdag\":\"⦮\",\"angmsdah\":\"⦯\",\"angrt\":\"∟\",\"angrtvb\":\"⊾\",\"angrtvbd\":\"⦝\",\"angsph\":\"∢\",\"angst\":\"Å\",\"angzarr\":\"⍼\",\"Aogon\":\"Ą\",\"aogon\":\"ą\",\"Aopf\":\"𝔸\",\"aopf\":\"𝕒\",\"ap\":\"≈\",\"apacir\":\"⩯\",\"apE\":\"⩰\",\"ape\":\"≊\",\"apid\":\"≋\",\"apos\":\"'\",\"ApplyFunction\":\"⁡\",\"approx\":\"≈\",\"approxeq\":\"≊\",\"Aring\":\"Å\",\"aring\":\"å\",\"Ascr\":\"𝒜\",\"ascr\":\"𝒶\",\"Assign\":\"≔\",\"ast\":\"*\",\"asymp\":\"≈\",\"asympeq\":\"≍\",\"Atilde\":\"Ã\",\"atilde\":\"ã\",\"Auml\":\"Ä\",\"auml\":\"ä\",\"awconint\":\"∳\",\"awint\":\"⨑\",\"backcong\":\"≌\",\"backepsilon\":\"϶\",\"backprime\":\"‵\",\"backsim\":\"∽\",\"backsimeq\":\"⋍\",\"Backslash\":\"∖\",\"Barv\":\"⫧\",\"barvee\":\"⊽\",\"Barwed\":\"⌆\",\"barwed\":\"⌅\",\"barwedge\":\"⌅\",\"bbrk\":\"⎵\",\"bbrktbrk\":\"⎶\",\"bcong\":\"≌\",\"Bcy\":\"Б\",\"bcy\":\"б\",\"bdquo\":\"„\",\"becaus\":\"∵\",\"Because\":\"∵\",\"because\":\"∵\",\"bemptyv\":\"⦰\",\"bepsi\":\"϶\",\"bernou\":\"ℬ\",\"Bernoullis\":\"ℬ\",\"Beta\":\"Β\",\"beta\":\"β\",\"beth\":\"ℶ\",\"between\":\"≬\",\"Bfr\":\"𝔅\",\"bfr\":\"𝔟\",\"bigcap\":\"⋂\",\"bigcirc\":\"◯\",\"bigcup\":\"⋃\",\"bigodot\":\"⨀\",\"bigoplus\":\"⨁\",\"bigotimes\":\"⨂\",\"bigsqcup\":\"⨆\",\"bigstar\":\"★\",\"bigtriangledown\":\"▽\",\"bigtriangleup\":\"△\",\"biguplus\":\"⨄\",\"bigvee\":\"⋁\",\"bigwedge\":\"⋀\",\"bkarow\":\"⤍\",\"blacklozenge\":\"⧫\",\"blacksquare\":\"▪\",\"blacktriangle\":\"▴\",\"blacktriangledown\":\"▾\",\"blacktriangleleft\":\"◂\",\"blacktriangleright\":\"▸\",\"blank\":\"␣\",\"blk12\":\"▒\",\"blk14\":\"░\",\"blk34\":\"▓\",\"block\":\"█\",\"bne\":\"=⃥\",\"bnequiv\":\"≡⃥\",\"bNot\":\"⫭\",\"bnot\":\"⌐\",\"Bopf\":\"𝔹\",\"bopf\":\"𝕓\",\"bot\":\"⊥\",\"bottom\":\"⊥\",\"bowtie\":\"⋈\",\"boxbox\":\"⧉\",\"boxDL\":\"╗\",\"boxDl\":\"╖\",\"boxdL\":\"╕\",\"boxdl\":\"┐\",\"boxDR\":\"╔\",\"boxDr\":\"╓\",\"boxdR\":\"╒\",\"boxdr\":\"┌\",\"boxH\":\"═\",\"boxh\":\"─\",\"boxHD\":\"╦\",\"boxHd\":\"╤\",\"boxhD\":\"╥\",\"boxhd\":\"┬\",\"boxHU\":\"╩\",\"boxHu\":\"╧\",\"boxhU\":\"╨\",\"boxhu\":\"┴\",\"boxminus\":\"⊟\",\"boxplus\":\"⊞\",\"boxtimes\":\"⊠\",\"boxUL\":\"╝\",\"boxUl\":\"╜\",\"boxuL\":\"╛\",\"boxul\":\"┘\",\"boxUR\":\"╚\",\"boxUr\":\"╙\",\"boxuR\":\"╘\",\"boxur\":\"└\",\"boxV\":\"║\",\"boxv\":\"│\",\"boxVH\":\"╬\",\"boxVh\":\"╫\",\"boxvH\":\"╪\",\"boxvh\":\"┼\",\"boxVL\":\"╣\",\"boxVl\":\"╢\",\"boxvL\":\"╡\",\"boxvl\":\"┤\",\"boxVR\":\"╠\",\"boxVr\":\"╟\",\"boxvR\":\"╞\",\"boxvr\":\"├\",\"bprime\":\"‵\",\"Breve\":\"˘\",\"breve\":\"˘\",\"brvbar\":\"¦\",\"Bscr\":\"ℬ\",\"bscr\":\"𝒷\",\"bsemi\":\"⁏\",\"bsim\":\"∽\",\"bsime\":\"⋍\",\"bsol\":\"\\\\\",\"bsolb\":\"⧅\",\"bsolhsub\":\"⟈\",\"bull\":\"•\",\"bullet\":\"•\",\"bump\":\"≎\",\"bumpE\":\"⪮\",\"bumpe\":\"≏\",\"Bumpeq\":\"≎\",\"bumpeq\":\"≏\",\"Cacute\":\"Ć\",\"cacute\":\"ć\",\"Cap\":\"⋒\",\"cap\":\"∩\",\"capand\":\"⩄\",\"capbrcup\":\"⩉\",\"capcap\":\"⩋\",\"capcup\":\"⩇\",\"capdot\":\"⩀\",\"CapitalDifferentialD\":\"ⅅ\",\"caps\":\"∩︀\",\"caret\":\"⁁\",\"caron\":\"ˇ\",\"Cayleys\":\"ℭ\",\"ccaps\":\"⩍\",\"Ccaron\":\"Č\",\"ccaron\":\"č\",\"Ccedil\":\"Ç\",\"ccedil\":\"ç\",\"Ccirc\":\"Ĉ\",\"ccirc\":\"ĉ\",\"Cconint\":\"∰\",\"ccups\":\"⩌\",\"ccupssm\":\"⩐\",\"Cdot\":\"Ċ\",\"cdot\":\"ċ\",\"cedil\":\"¸\",\"Cedilla\":\"¸\",\"cemptyv\":\"⦲\",\"cent\":\"¢\",\"CenterDot\":\"·\",\"centerdot\":\"·\",\"Cfr\":\"ℭ\",\"cfr\":\"𝔠\",\"CHcy\":\"Ч\",\"chcy\":\"ч\",\"check\":\"✓\",\"checkmark\":\"✓\",\"Chi\":\"Χ\",\"chi\":\"χ\",\"cir\":\"○\",\"circ\":\"ˆ\",\"circeq\":\"≗\",\"circlearrowleft\":\"↺\",\"circlearrowright\":\"↻\",\"circledast\":\"⊛\",\"circledcirc\":\"⊚\",\"circleddash\":\"⊝\",\"CircleDot\":\"⊙\",\"circledR\":\"®\",\"circledS\":\"Ⓢ\",\"CircleMinus\":\"⊖\",\"CirclePlus\":\"⊕\",\"CircleTimes\":\"⊗\",\"cirE\":\"⧃\",\"cire\":\"≗\",\"cirfnint\":\"⨐\",\"cirmid\":\"⫯\",\"cirscir\":\"⧂\",\"ClockwiseContourIntegral\":\"∲\",\"CloseCurlyDoubleQuote\":\"”\",\"CloseCurlyQuote\":\"’\",\"clubs\":\"♣\",\"clubsuit\":\"♣\",\"Colon\":\"∷\",\"colon\":\":\",\"Colone\":\"⩴\",\"colone\":\"≔\",\"coloneq\":\"≔\",\"comma\":\",\",\"commat\":\"@\",\"comp\":\"∁\",\"compfn\":\"∘\",\"complement\":\"∁\",\"complexes\":\"ℂ\",\"cong\":\"≅\",\"congdot\":\"⩭\",\"Congruent\":\"≡\",\"Conint\":\"∯\",\"conint\":\"∮\",\"ContourIntegral\":\"∮\",\"Copf\":\"ℂ\",\"copf\":\"𝕔\",\"coprod\":\"∐\",\"Coproduct\":\"∐\",\"COPY\":\"©\",\"copy\":\"©\",\"copysr\":\"℗\",\"CounterClockwiseContourIntegral\":\"∳\",\"crarr\":\"↵\",\"Cross\":\"⨯\",\"cross\":\"✗\",\"Cscr\":\"𝒞\",\"cscr\":\"𝒸\",\"csub\":\"⫏\",\"csube\":\"⫑\",\"csup\":\"⫐\",\"csupe\":\"⫒\",\"ctdot\":\"⋯\",\"cudarrl\":\"⤸\",\"cudarrr\":\"⤵\",\"cuepr\":\"⋞\",\"cuesc\":\"⋟\",\"cularr\":\"↶\",\"cularrp\":\"⤽\",\"Cup\":\"⋓\",\"cup\":\"∪\",\"cupbrcap\":\"⩈\",\"CupCap\":\"≍\",\"cupcap\":\"⩆\",\"cupcup\":\"⩊\",\"cupdot\":\"⊍\",\"cupor\":\"⩅\",\"cups\":\"∪︀\",\"curarr\":\"↷\",\"curarrm\":\"⤼\",\"curlyeqprec\":\"⋞\",\"curlyeqsucc\":\"⋟\",\"curlyvee\":\"⋎\",\"curlywedge\":\"⋏\",\"curren\":\"¤\",\"curvearrowleft\":\"↶\",\"curvearrowright\":\"↷\",\"cuvee\":\"⋎\",\"cuwed\":\"⋏\",\"cwconint\":\"∲\",\"cwint\":\"∱\",\"cylcty\":\"⌭\",\"Dagger\":\"‡\",\"dagger\":\"†\",\"daleth\":\"ℸ\",\"Darr\":\"↡\",\"dArr\":\"⇓\",\"darr\":\"↓\",\"dash\":\"‐\",\"Dashv\":\"⫤\",\"dashv\":\"⊣\",\"dbkarow\":\"⤏\",\"dblac\":\"˝\",\"Dcaron\":\"Ď\",\"dcaron\":\"ď\",\"Dcy\":\"Д\",\"dcy\":\"д\",\"DD\":\"ⅅ\",\"dd\":\"ⅆ\",\"ddagger\":\"‡\",\"ddarr\":\"⇊\",\"DDotrahd\":\"⤑\",\"ddotseq\":\"⩷\",\"deg\":\"°\",\"Del\":\"∇\",\"Delta\":\"Δ\",\"delta\":\"δ\",\"demptyv\":\"⦱\",\"dfisht\":\"⥿\",\"Dfr\":\"𝔇\",\"dfr\":\"𝔡\",\"dHar\":\"⥥\",\"dharl\":\"⇃\",\"dharr\":\"⇂\",\"DiacriticalAcute\":\"´\",\"DiacriticalDot\":\"˙\",\"DiacriticalDoubleAcute\":\"˝\",\"DiacriticalGrave\":\"`\",\"DiacriticalTilde\":\"˜\",\"diam\":\"⋄\",\"Diamond\":\"⋄\",\"diamond\":\"⋄\",\"diamondsuit\":\"♦\",\"diams\":\"♦\",\"die\":\"¨\",\"DifferentialD\":\"ⅆ\",\"digamma\":\"ϝ\",\"disin\":\"⋲\",\"div\":\"÷\",\"divide\":\"÷\",\"divideontimes\":\"⋇\",\"divonx\":\"⋇\",\"DJcy\":\"Ђ\",\"djcy\":\"ђ\",\"dlcorn\":\"⌞\",\"dlcrop\":\"⌍\",\"dollar\":\"$\",\"Dopf\":\"𝔻\",\"dopf\":\"𝕕\",\"Dot\":\"¨\",\"dot\":\"˙\",\"DotDot\":\"⃜\",\"doteq\":\"≐\",\"doteqdot\":\"≑\",\"DotEqual\":\"≐\",\"dotminus\":\"∸\",\"dotplus\":\"∔\",\"dotsquare\":\"⊡\",\"doublebarwedge\":\"⌆\",\"DoubleContourIntegral\":\"∯\",\"DoubleDot\":\"¨\",\"DoubleDownArrow\":\"⇓\",\"DoubleLeftArrow\":\"⇐\",\"DoubleLeftRightArrow\":\"⇔\",\"DoubleLeftTee\":\"⫤\",\"DoubleLongLeftArrow\":\"⟸\",\"DoubleLongLeftRightArrow\":\"⟺\",\"DoubleLongRightArrow\":\"⟹\",\"DoubleRightArrow\":\"⇒\",\"DoubleRightTee\":\"⊨\",\"DoubleUpArrow\":\"⇑\",\"DoubleUpDownArrow\":\"⇕\",\"DoubleVerticalBar\":\"∥\",\"DownArrow\":\"↓\",\"Downarrow\":\"⇓\",\"downarrow\":\"↓\",\"DownArrowBar\":\"⤓\",\"DownArrowUpArrow\":\"⇵\",\"DownBreve\":\"̑\",\"downdownarrows\":\"⇊\",\"downharpoonleft\":\"⇃\",\"downharpoonright\":\"⇂\",\"DownLeftRightVector\":\"⥐\",\"DownLeftTeeVector\":\"⥞\",\"DownLeftVector\":\"↽\",\"DownLeftVectorBar\":\"⥖\",\"DownRightTeeVector\":\"⥟\",\"DownRightVector\":\"⇁\",\"DownRightVectorBar\":\"⥗\",\"DownTee\":\"⊤\",\"DownTeeArrow\":\"↧\",\"drbkarow\":\"⤐\",\"drcorn\":\"⌟\",\"drcrop\":\"⌌\",\"Dscr\":\"𝒟\",\"dscr\":\"𝒹\",\"DScy\":\"Ѕ\",\"dscy\":\"ѕ\",\"dsol\":\"⧶\",\"Dstrok\":\"Đ\",\"dstrok\":\"đ\",\"dtdot\":\"⋱\",\"dtri\":\"▿\",\"dtrif\":\"▾\",\"duarr\":\"⇵\",\"duhar\":\"⥯\",\"dwangle\":\"⦦\",\"DZcy\":\"Џ\",\"dzcy\":\"џ\",\"dzigrarr\":\"⟿\",\"Eacute\":\"É\",\"eacute\":\"é\",\"easter\":\"⩮\",\"Ecaron\":\"Ě\",\"ecaron\":\"ě\",\"ecir\":\"≖\",\"Ecirc\":\"Ê\",\"ecirc\":\"ê\",\"ecolon\":\"≕\",\"Ecy\":\"Э\",\"ecy\":\"э\",\"eDDot\":\"⩷\",\"Edot\":\"Ė\",\"eDot\":\"≑\",\"edot\":\"ė\",\"ee\":\"ⅇ\",\"efDot\":\"≒\",\"Efr\":\"𝔈\",\"efr\":\"𝔢\",\"eg\":\"⪚\",\"Egrave\":\"È\",\"egrave\":\"è\",\"egs\":\"⪖\",\"egsdot\":\"⪘\",\"el\":\"⪙\",\"Element\":\"∈\",\"elinters\":\"⏧\",\"ell\":\"ℓ\",\"els\":\"⪕\",\"elsdot\":\"⪗\",\"Emacr\":\"Ē\",\"emacr\":\"ē\",\"empty\":\"∅\",\"emptyset\":\"∅\",\"EmptySmallSquare\":\"◻\",\"emptyv\":\"∅\",\"EmptyVerySmallSquare\":\"▫\",\"emsp13\":\" \",\"emsp14\":\" \",\"emsp\":\" \",\"ENG\":\"Ŋ\",\"eng\":\"ŋ\",\"ensp\":\" \",\"Eogon\":\"Ę\",\"eogon\":\"ę\",\"Eopf\":\"𝔼\",\"eopf\":\"𝕖\",\"epar\":\"⋕\",\"eparsl\":\"⧣\",\"eplus\":\"⩱\",\"epsi\":\"ε\",\"Epsilon\":\"Ε\",\"epsilon\":\"ε\",\"epsiv\":\"ϵ\",\"eqcirc\":\"≖\",\"eqcolon\":\"≕\",\"eqsim\":\"≂\",\"eqslantgtr\":\"⪖\",\"eqslantless\":\"⪕\",\"Equal\":\"⩵\",\"equals\":\"=\",\"EqualTilde\":\"≂\",\"equest\":\"≟\",\"Equilibrium\":\"⇌\",\"equiv\":\"≡\",\"equivDD\":\"⩸\",\"eqvparsl\":\"⧥\",\"erarr\":\"⥱\",\"erDot\":\"≓\",\"Escr\":\"ℰ\",\"escr\":\"ℯ\",\"esdot\":\"≐\",\"Esim\":\"⩳\",\"esim\":\"≂\",\"Eta\":\"Η\",\"eta\":\"η\",\"ETH\":\"Ð\",\"eth\":\"ð\",\"Euml\":\"Ë\",\"euml\":\"ë\",\"euro\":\"€\",\"excl\":\"!\",\"exist\":\"∃\",\"Exists\":\"∃\",\"expectation\":\"ℰ\",\"ExponentialE\":\"ⅇ\",\"exponentiale\":\"ⅇ\",\"fallingdotseq\":\"≒\",\"Fcy\":\"Ф\",\"fcy\":\"ф\",\"female\":\"♀\",\"ffilig\":\"ﬃ\",\"fflig\":\"ﬀ\",\"ffllig\":\"ﬄ\",\"Ffr\":\"𝔉\",\"ffr\":\"𝔣\",\"filig\":\"ﬁ\",\"FilledSmallSquare\":\"◼\",\"FilledVerySmallSquare\":\"▪\",\"fjlig\":\"fj\",\"flat\":\"♭\",\"fllig\":\"ﬂ\",\"fltns\":\"▱\",\"fnof\":\"ƒ\",\"Fopf\":\"𝔽\",\"fopf\":\"𝕗\",\"ForAll\":\"∀\",\"forall\":\"∀\",\"fork\":\"⋔\",\"forkv\":\"⫙\",\"Fouriertrf\":\"ℱ\",\"fpartint\":\"⨍\",\"frac12\":\"½\",\"frac13\":\"⅓\",\"frac14\":\"¼\",\"frac15\":\"⅕\",\"frac16\":\"⅙\",\"frac18\":\"⅛\",\"frac23\":\"⅔\",\"frac25\":\"⅖\",\"frac34\":\"¾\",\"frac35\":\"⅗\",\"frac38\":\"⅜\",\"frac45\":\"⅘\",\"frac56\":\"⅚\",\"frac58\":\"⅝\",\"frac78\":\"⅞\",\"frasl\":\"⁄\",\"frown\":\"⌢\",\"Fscr\":\"ℱ\",\"fscr\":\"𝒻\",\"gacute\":\"ǵ\",\"Gamma\":\"Γ\",\"gamma\":\"γ\",\"Gammad\":\"Ϝ\",\"gammad\":\"ϝ\",\"gap\":\"⪆\",\"Gbreve\":\"Ğ\",\"gbreve\":\"ğ\",\"Gcedil\":\"Ģ\",\"Gcirc\":\"Ĝ\",\"gcirc\":\"ĝ\",\"Gcy\":\"Г\",\"gcy\":\"г\",\"Gdot\":\"Ġ\",\"gdot\":\"ġ\",\"gE\":\"≧\",\"ge\":\"≥\",\"gEl\":\"⪌\",\"gel\":\"⋛\",\"geq\":\"≥\",\"geqq\":\"≧\",\"geqslant\":\"⩾\",\"ges\":\"⩾\",\"gescc\":\"⪩\",\"gesdot\":\"⪀\",\"gesdoto\":\"⪂\",\"gesdotol\":\"⪄\",\"gesl\":\"⋛︀\",\"gesles\":\"⪔\",\"Gfr\":\"𝔊\",\"gfr\":\"𝔤\",\"Gg\":\"⋙\",\"gg\":\"≫\",\"ggg\":\"⋙\",\"gimel\":\"ℷ\",\"GJcy\":\"Ѓ\",\"gjcy\":\"ѓ\",\"gl\":\"≷\",\"gla\":\"⪥\",\"glE\":\"⪒\",\"glj\":\"⪤\",\"gnap\":\"⪊\",\"gnapprox\":\"⪊\",\"gnE\":\"≩\",\"gne\":\"⪈\",\"gneq\":\"⪈\",\"gneqq\":\"≩\",\"gnsim\":\"⋧\",\"Gopf\":\"𝔾\",\"gopf\":\"𝕘\",\"grave\":\"`\",\"GreaterEqual\":\"≥\",\"GreaterEqualLess\":\"⋛\",\"GreaterFullEqual\":\"≧\",\"GreaterGreater\":\"⪢\",\"GreaterLess\":\"≷\",\"GreaterSlantEqual\":\"⩾\",\"GreaterTilde\":\"≳\",\"Gscr\":\"𝒢\",\"gscr\":\"ℊ\",\"gsim\":\"≳\",\"gsime\":\"⪎\",\"gsiml\":\"⪐\",\"GT\":\">\",\"Gt\":\"≫\",\"gt\":\">\",\"gtcc\":\"⪧\",\"gtcir\":\"⩺\",\"gtdot\":\"⋗\",\"gtlPar\":\"⦕\",\"gtquest\":\"⩼\",\"gtrapprox\":\"⪆\",\"gtrarr\":\"⥸\",\"gtrdot\":\"⋗\",\"gtreqless\":\"⋛\",\"gtreqqless\":\"⪌\",\"gtrless\":\"≷\",\"gtrsim\":\"≳\",\"gvertneqq\":\"≩︀\",\"gvnE\":\"≩︀\",\"Hacek\":\"ˇ\",\"hairsp\":\" \",\"half\":\"½\",\"hamilt\":\"ℋ\",\"HARDcy\":\"Ъ\",\"hardcy\":\"ъ\",\"hArr\":\"⇔\",\"harr\":\"↔\",\"harrcir\":\"⥈\",\"harrw\":\"↭\",\"Hat\":\"^\",\"hbar\":\"ℏ\",\"Hcirc\":\"Ĥ\",\"hcirc\":\"ĥ\",\"hearts\":\"♥\",\"heartsuit\":\"♥\",\"hellip\":\"…\",\"hercon\":\"⊹\",\"Hfr\":\"ℌ\",\"hfr\":\"𝔥\",\"HilbertSpace\":\"ℋ\",\"hksearow\":\"⤥\",\"hkswarow\":\"⤦\",\"hoarr\":\"⇿\",\"homtht\":\"∻\",\"hookleftarrow\":\"↩\",\"hookrightarrow\":\"↪\",\"Hopf\":\"ℍ\",\"hopf\":\"𝕙\",\"horbar\":\"―\",\"HorizontalLine\":\"─\",\"Hscr\":\"ℋ\",\"hscr\":\"𝒽\",\"hslash\":\"ℏ\",\"Hstrok\":\"Ħ\",\"hstrok\":\"ħ\",\"HumpDownHump\":\"≎\",\"HumpEqual\":\"≏\",\"hybull\":\"⁃\",\"hyphen\":\"‐\",\"Iacute\":\"Í\",\"iacute\":\"í\",\"ic\":\"⁣\",\"Icirc\":\"Î\",\"icirc\":\"î\",\"Icy\":\"И\",\"icy\":\"и\",\"Idot\":\"İ\",\"IEcy\":\"Е\",\"iecy\":\"е\",\"iexcl\":\"¡\",\"iff\":\"⇔\",\"Ifr\":\"ℑ\",\"ifr\":\"𝔦\",\"Igrave\":\"Ì\",\"igrave\":\"ì\",\"ii\":\"ⅈ\",\"iiiint\":\"⨌\",\"iiint\":\"∭\",\"iinfin\":\"⧜\",\"iiota\":\"℩\",\"IJlig\":\"Ĳ\",\"ijlig\":\"ĳ\",\"Im\":\"ℑ\",\"Imacr\":\"Ī\",\"imacr\":\"ī\",\"image\":\"ℑ\",\"ImaginaryI\":\"ⅈ\",\"imagline\":\"ℐ\",\"imagpart\":\"ℑ\",\"imath\":\"ı\",\"imof\":\"⊷\",\"imped\":\"Ƶ\",\"Implies\":\"⇒\",\"in\":\"∈\",\"incare\":\"℅\",\"infin\":\"∞\",\"infintie\":\"⧝\",\"inodot\":\"ı\",\"Int\":\"∬\",\"int\":\"∫\",\"intcal\":\"⊺\",\"integers\":\"ℤ\",\"Integral\":\"∫\",\"intercal\":\"⊺\",\"Intersection\":\"⋂\",\"intlarhk\":\"⨗\",\"intprod\":\"⨼\",\"InvisibleComma\":\"⁣\",\"InvisibleTimes\":\"⁢\",\"IOcy\":\"Ё\",\"iocy\":\"ё\",\"Iogon\":\"Į\",\"iogon\":\"į\",\"Iopf\":\"𝕀\",\"iopf\":\"𝕚\",\"Iota\":\"Ι\",\"iota\":\"ι\",\"iprod\":\"⨼\",\"iquest\":\"¿\",\"Iscr\":\"ℐ\",\"iscr\":\"𝒾\",\"isin\":\"∈\",\"isindot\":\"⋵\",\"isinE\":\"⋹\",\"isins\":\"⋴\",\"isinsv\":\"⋳\",\"isinv\":\"∈\",\"it\":\"⁢\",\"Itilde\":\"Ĩ\",\"itilde\":\"ĩ\",\"Iukcy\":\"І\",\"iukcy\":\"і\",\"Iuml\":\"Ï\",\"iuml\":\"ï\",\"Jcirc\":\"Ĵ\",\"jcirc\":\"ĵ\",\"Jcy\":\"Й\",\"jcy\":\"й\",\"Jfr\":\"𝔍\",\"jfr\":\"𝔧\",\"jmath\":\"ȷ\",\"Jopf\":\"𝕁\",\"jopf\":\"𝕛\",\"Jscr\":\"𝒥\",\"jscr\":\"𝒿\",\"Jsercy\":\"Ј\",\"jsercy\":\"ј\",\"Jukcy\":\"Є\",\"jukcy\":\"є\",\"Kappa\":\"Κ\",\"kappa\":\"κ\",\"kappav\":\"ϰ\",\"Kcedil\":\"Ķ\",\"kcedil\":\"ķ\",\"Kcy\":\"К\",\"kcy\":\"к\",\"Kfr\":\"𝔎\",\"kfr\":\"𝔨\",\"kgreen\":\"ĸ\",\"KHcy\":\"Х\",\"khcy\":\"х\",\"KJcy\":\"Ќ\",\"kjcy\":\"ќ\",\"Kopf\":\"𝕂\",\"kopf\":\"𝕜\",\"Kscr\":\"𝒦\",\"kscr\":\"𝓀\",\"lAarr\":\"⇚\",\"Lacute\":\"Ĺ\",\"lacute\":\"ĺ\",\"laemptyv\":\"⦴\",\"lagran\":\"ℒ\",\"Lambda\":\"Λ\",\"lambda\":\"λ\",\"Lang\":\"⟪\",\"lang\":\"⟨\",\"langd\":\"⦑\",\"langle\":\"⟨\",\"lap\":\"⪅\",\"Laplacetrf\":\"ℒ\",\"laquo\":\"«\",\"Larr\":\"↞\",\"lArr\":\"⇐\",\"larr\":\"←\",\"larrb\":\"⇤\",\"larrbfs\":\"⤟\",\"larrfs\":\"⤝\",\"larrhk\":\"↩\",\"larrlp\":\"↫\",\"larrpl\":\"⤹\",\"larrsim\":\"⥳\",\"larrtl\":\"↢\",\"lat\":\"⪫\",\"lAtail\":\"⤛\",\"latail\":\"⤙\",\"late\":\"⪭\",\"lates\":\"⪭︀\",\"lBarr\":\"⤎\",\"lbarr\":\"⤌\",\"lbbrk\":\"❲\",\"lbrace\":\"{\",\"lbrack\":\"[\",\"lbrke\":\"⦋\",\"lbrksld\":\"⦏\",\"lbrkslu\":\"⦍\",\"Lcaron\":\"Ľ\",\"lcaron\":\"ľ\",\"Lcedil\":\"Ļ\",\"lcedil\":\"ļ\",\"lceil\":\"⌈\",\"lcub\":\"{\",\"Lcy\":\"Л\",\"lcy\":\"л\",\"ldca\":\"⤶\",\"ldquo\":\"“\",\"ldquor\":\"„\",\"ldrdhar\":\"⥧\",\"ldrushar\":\"⥋\",\"ldsh\":\"↲\",\"lE\":\"≦\",\"le\":\"≤\",\"LeftAngleBracket\":\"⟨\",\"LeftArrow\":\"←\",\"Leftarrow\":\"⇐\",\"leftarrow\":\"←\",\"LeftArrowBar\":\"⇤\",\"LeftArrowRightArrow\":\"⇆\",\"leftarrowtail\":\"↢\",\"LeftCeiling\":\"⌈\",\"LeftDoubleBracket\":\"⟦\",\"LeftDownTeeVector\":\"⥡\",\"LeftDownVector\":\"⇃\",\"LeftDownVectorBar\":\"⥙\",\"LeftFloor\":\"⌊\",\"leftharpoondown\":\"↽\",\"leftharpoonup\":\"↼\",\"leftleftarrows\":\"⇇\",\"LeftRightArrow\":\"↔\",\"Leftrightarrow\":\"⇔\",\"leftrightarrow\":\"↔\",\"leftrightarrows\":\"⇆\",\"leftrightharpoons\":\"⇋\",\"leftrightsquigarrow\":\"↭\",\"LeftRightVector\":\"⥎\",\"LeftTee\":\"⊣\",\"LeftTeeArrow\":\"↤\",\"LeftTeeVector\":\"⥚\",\"leftthreetimes\":\"⋋\",\"LeftTriangle\":\"⊲\",\"LeftTriangleBar\":\"⧏\",\"LeftTriangleEqual\":\"⊴\",\"LeftUpDownVector\":\"⥑\",\"LeftUpTeeVector\":\"⥠\",\"LeftUpVector\":\"↿\",\"LeftUpVectorBar\":\"⥘\",\"LeftVector\":\"↼\",\"LeftVectorBar\":\"⥒\",\"lEg\":\"⪋\",\"leg\":\"⋚\",\"leq\":\"≤\",\"leqq\":\"≦\",\"leqslant\":\"⩽\",\"les\":\"⩽\",\"lescc\":\"⪨\",\"lesdot\":\"⩿\",\"lesdoto\":\"⪁\",\"lesdotor\":\"⪃\",\"lesg\":\"⋚︀\",\"lesges\":\"⪓\",\"lessapprox\":\"⪅\",\"lessdot\":\"⋖\",\"lesseqgtr\":\"⋚\",\"lesseqqgtr\":\"⪋\",\"LessEqualGreater\":\"⋚\",\"LessFullEqual\":\"≦\",\"LessGreater\":\"≶\",\"lessgtr\":\"≶\",\"LessLess\":\"⪡\",\"lesssim\":\"≲\",\"LessSlantEqual\":\"⩽\",\"LessTilde\":\"≲\",\"lfisht\":\"⥼\",\"lfloor\":\"⌊\",\"Lfr\":\"𝔏\",\"lfr\":\"𝔩\",\"lg\":\"≶\",\"lgE\":\"⪑\",\"lHar\":\"⥢\",\"lhard\":\"↽\",\"lharu\":\"↼\",\"lharul\":\"⥪\",\"lhblk\":\"▄\",\"LJcy\":\"Љ\",\"ljcy\":\"љ\",\"Ll\":\"⋘\",\"ll\":\"≪\",\"llarr\":\"⇇\",\"llcorner\":\"⌞\",\"Lleftarrow\":\"⇚\",\"llhard\":\"⥫\",\"lltri\":\"◺\",\"Lmidot\":\"Ŀ\",\"lmidot\":\"ŀ\",\"lmoust\":\"⎰\",\"lmoustache\":\"⎰\",\"lnap\":\"⪉\",\"lnapprox\":\"⪉\",\"lnE\":\"≨\",\"lne\":\"⪇\",\"lneq\":\"⪇\",\"lneqq\":\"≨\",\"lnsim\":\"⋦\",\"loang\":\"⟬\",\"loarr\":\"⇽\",\"lobrk\":\"⟦\",\"LongLeftArrow\":\"⟵\",\"Longleftarrow\":\"⟸\",\"longleftarrow\":\"⟵\",\"LongLeftRightArrow\":\"⟷\",\"Longleftrightarrow\":\"⟺\",\"longleftrightarrow\":\"⟷\",\"longmapsto\":\"⟼\",\"LongRightArrow\":\"⟶\",\"Longrightarrow\":\"⟹\",\"longrightarrow\":\"⟶\",\"looparrowleft\":\"↫\",\"looparrowright\":\"↬\",\"lopar\":\"⦅\",\"Lopf\":\"𝕃\",\"lopf\":\"𝕝\",\"loplus\":\"⨭\",\"lotimes\":\"⨴\",\"lowast\":\"∗\",\"lowbar\":\"_\",\"LowerLeftArrow\":\"↙\",\"LowerRightArrow\":\"↘\",\"loz\":\"◊\",\"lozenge\":\"◊\",\"lozf\":\"⧫\",\"lpar\":\"(\",\"lparlt\":\"⦓\",\"lrarr\":\"⇆\",\"lrcorner\":\"⌟\",\"lrhar\":\"⇋\",\"lrhard\":\"⥭\",\"lrm\":\"‎\",\"lrtri\":\"⊿\",\"lsaquo\":\"‹\",\"Lscr\":\"ℒ\",\"lscr\":\"𝓁\",\"Lsh\":\"↰\",\"lsh\":\"↰\",\"lsim\":\"≲\",\"lsime\":\"⪍\",\"lsimg\":\"⪏\",\"lsqb\":\"[\",\"lsquo\":\"‘\",\"lsquor\":\"‚\",\"Lstrok\":\"Ł\",\"lstrok\":\"ł\",\"LT\":\"<\",\"Lt\":\"≪\",\"lt\":\"<\",\"ltcc\":\"⪦\",\"ltcir\":\"⩹\",\"ltdot\":\"⋖\",\"lthree\":\"⋋\",\"ltimes\":\"⋉\",\"ltlarr\":\"⥶\",\"ltquest\":\"⩻\",\"ltri\":\"◃\",\"ltrie\":\"⊴\",\"ltrif\":\"◂\",\"ltrPar\":\"⦖\",\"lurdshar\":\"⥊\",\"luruhar\":\"⥦\",\"lvertneqq\":\"≨︀\",\"lvnE\":\"≨︀\",\"macr\":\"¯\",\"male\":\"♂\",\"malt\":\"✠\",\"maltese\":\"✠\",\"Map\":\"⤅\",\"map\":\"↦\",\"mapsto\":\"↦\",\"mapstodown\":\"↧\",\"mapstoleft\":\"↤\",\"mapstoup\":\"↥\",\"marker\":\"▮\",\"mcomma\":\"⨩\",\"Mcy\":\"М\",\"mcy\":\"м\",\"mdash\":\"—\",\"mDDot\":\"∺\",\"measuredangle\":\"∡\",\"MediumSpace\":\" \",\"Mellintrf\":\"ℳ\",\"Mfr\":\"𝔐\",\"mfr\":\"𝔪\",\"mho\":\"℧\",\"micro\":\"µ\",\"mid\":\"∣\",\"midast\":\"*\",\"midcir\":\"⫰\",\"middot\":\"·\",\"minus\":\"−\",\"minusb\":\"⊟\",\"minusd\":\"∸\",\"minusdu\":\"⨪\",\"MinusPlus\":\"∓\",\"mlcp\":\"⫛\",\"mldr\":\"…\",\"mnplus\":\"∓\",\"models\":\"⊧\",\"Mopf\":\"𝕄\",\"mopf\":\"𝕞\",\"mp\":\"∓\",\"Mscr\":\"ℳ\",\"mscr\":\"𝓂\",\"mstpos\":\"∾\",\"Mu\":\"Μ\",\"mu\":\"μ\",\"multimap\":\"⊸\",\"mumap\":\"⊸\",\"nabla\":\"∇\",\"Nacute\":\"Ń\",\"nacute\":\"ń\",\"nang\":\"∠⃒\",\"nap\":\"≉\",\"napE\":\"⩰̸\",\"napid\":\"≋̸\",\"napos\":\"ŉ\",\"napprox\":\"≉\",\"natur\":\"♮\",\"natural\":\"♮\",\"naturals\":\"ℕ\",\"nbsp\":\" \",\"nbump\":\"≎̸\",\"nbumpe\":\"≏̸\",\"ncap\":\"⩃\",\"Ncaron\":\"Ň\",\"ncaron\":\"ň\",\"Ncedil\":\"Ņ\",\"ncedil\":\"ņ\",\"ncong\":\"≇\",\"ncongdot\":\"⩭̸\",\"ncup\":\"⩂\",\"Ncy\":\"Н\",\"ncy\":\"н\",\"ndash\":\"–\",\"ne\":\"≠\",\"nearhk\":\"⤤\",\"neArr\":\"⇗\",\"nearr\":\"↗\",\"nearrow\":\"↗\",\"nedot\":\"≐̸\",\"NegativeMediumSpace\":\"​\",\"NegativeThickSpace\":\"​\",\"NegativeThinSpace\":\"​\",\"NegativeVeryThinSpace\":\"​\",\"nequiv\":\"≢\",\"nesear\":\"⤨\",\"nesim\":\"≂̸\",\"NestedGreaterGreater\":\"≫\",\"NestedLessLess\":\"≪\",\"NewLine\":\"\\n\",\"nexist\":\"∄\",\"nexists\":\"∄\",\"Nfr\":\"𝔑\",\"nfr\":\"𝔫\",\"ngE\":\"≧̸\",\"nge\":\"≱\",\"ngeq\":\"≱\",\"ngeqq\":\"≧̸\",\"ngeqslant\":\"⩾̸\",\"nges\":\"⩾̸\",\"nGg\":\"⋙̸\",\"ngsim\":\"≵\",\"nGt\":\"≫⃒\",\"ngt\":\"≯\",\"ngtr\":\"≯\",\"nGtv\":\"≫̸\",\"nhArr\":\"⇎\",\"nharr\":\"↮\",\"nhpar\":\"⫲\",\"ni\":\"∋\",\"nis\":\"⋼\",\"nisd\":\"⋺\",\"niv\":\"∋\",\"NJcy\":\"Њ\",\"njcy\":\"њ\",\"nlArr\":\"⇍\",\"nlarr\":\"↚\",\"nldr\":\"‥\",\"nlE\":\"≦̸\",\"nle\":\"≰\",\"nLeftarrow\":\"⇍\",\"nleftarrow\":\"↚\",\"nLeftrightarrow\":\"⇎\",\"nleftrightarrow\":\"↮\",\"nleq\":\"≰\",\"nleqq\":\"≦̸\",\"nleqslant\":\"⩽̸\",\"nles\":\"⩽̸\",\"nless\":\"≮\",\"nLl\":\"⋘̸\",\"nlsim\":\"≴\",\"nLt\":\"≪⃒\",\"nlt\":\"≮\",\"nltri\":\"⋪\",\"nltrie\":\"⋬\",\"nLtv\":\"≪̸\",\"nmid\":\"∤\",\"NoBreak\":\"⁠\",\"NonBreakingSpace\":\" \",\"Nopf\":\"ℕ\",\"nopf\":\"𝕟\",\"Not\":\"⫬\",\"not\":\"¬\",\"NotCongruent\":\"≢\",\"NotCupCap\":\"≭\",\"NotDoubleVerticalBar\":\"∦\",\"NotElement\":\"∉\",\"NotEqual\":\"≠\",\"NotEqualTilde\":\"≂̸\",\"NotExists\":\"∄\",\"NotGreater\":\"≯\",\"NotGreaterEqual\":\"≱\",\"NotGreaterFullEqual\":\"≧̸\",\"NotGreaterGreater\":\"≫̸\",\"NotGreaterLess\":\"≹\",\"NotGreaterSlantEqual\":\"⩾̸\",\"NotGreaterTilde\":\"≵\",\"NotHumpDownHump\":\"≎̸\",\"NotHumpEqual\":\"≏̸\",\"notin\":\"∉\",\"notindot\":\"⋵̸\",\"notinE\":\"⋹̸\",\"notinva\":\"∉\",\"notinvb\":\"⋷\",\"notinvc\":\"⋶\",\"NotLeftTriangle\":\"⋪\",\"NotLeftTriangleBar\":\"⧏̸\",\"NotLeftTriangleEqual\":\"⋬\",\"NotLess\":\"≮\",\"NotLessEqual\":\"≰\",\"NotLessGreater\":\"≸\",\"NotLessLess\":\"≪̸\",\"NotLessSlantEqual\":\"⩽̸\",\"NotLessTilde\":\"≴\",\"NotNestedGreaterGreater\":\"⪢̸\",\"NotNestedLessLess\":\"⪡̸\",\"notni\":\"∌\",\"notniva\":\"∌\",\"notnivb\":\"⋾\",\"notnivc\":\"⋽\",\"NotPrecedes\":\"⊀\",\"NotPrecedesEqual\":\"⪯̸\",\"NotPrecedesSlantEqual\":\"⋠\",\"NotReverseElement\":\"∌\",\"NotRightTriangle\":\"⋫\",\"NotRightTriangleBar\":\"⧐̸\",\"NotRightTriangleEqual\":\"⋭\",\"NotSquareSubset\":\"⊏̸\",\"NotSquareSubsetEqual\":\"⋢\",\"NotSquareSuperset\":\"⊐̸\",\"NotSquareSupersetEqual\":\"⋣\",\"NotSubset\":\"⊂⃒\",\"NotSubsetEqual\":\"⊈\",\"NotSucceeds\":\"⊁\",\"NotSucceedsEqual\":\"⪰̸\",\"NotSucceedsSlantEqual\":\"⋡\",\"NotSucceedsTilde\":\"≿̸\",\"NotSuperset\":\"⊃⃒\",\"NotSupersetEqual\":\"⊉\",\"NotTilde\":\"≁\",\"NotTildeEqual\":\"≄\",\"NotTildeFullEqual\":\"≇\",\"NotTildeTilde\":\"≉\",\"NotVerticalBar\":\"∤\",\"npar\":\"∦\",\"nparallel\":\"∦\",\"nparsl\":\"⫽⃥\",\"npart\":\"∂̸\",\"npolint\":\"⨔\",\"npr\":\"⊀\",\"nprcue\":\"⋠\",\"npre\":\"⪯̸\",\"nprec\":\"⊀\",\"npreceq\":\"⪯̸\",\"nrArr\":\"⇏\",\"nrarr\":\"↛\",\"nrarrc\":\"⤳̸\",\"nrarrw\":\"↝̸\",\"nRightarrow\":\"⇏\",\"nrightarrow\":\"↛\",\"nrtri\":\"⋫\",\"nrtrie\":\"⋭\",\"nsc\":\"⊁\",\"nsccue\":\"⋡\",\"nsce\":\"⪰̸\",\"Nscr\":\"𝒩\",\"nscr\":\"𝓃\",\"nshortmid\":\"∤\",\"nshortparallel\":\"∦\",\"nsim\":\"≁\",\"nsime\":\"≄\",\"nsimeq\":\"≄\",\"nsmid\":\"∤\",\"nspar\":\"∦\",\"nsqsube\":\"⋢\",\"nsqsupe\":\"⋣\",\"nsub\":\"⊄\",\"nsubE\":\"⫅̸\",\"nsube\":\"⊈\",\"nsubset\":\"⊂⃒\",\"nsubseteq\":\"⊈\",\"nsubseteqq\":\"⫅̸\",\"nsucc\":\"⊁\",\"nsucceq\":\"⪰̸\",\"nsup\":\"⊅\",\"nsupE\":\"⫆̸\",\"nsupe\":\"⊉\",\"nsupset\":\"⊃⃒\",\"nsupseteq\":\"⊉\",\"nsupseteqq\":\"⫆̸\",\"ntgl\":\"≹\",\"Ntilde\":\"Ñ\",\"ntilde\":\"ñ\",\"ntlg\":\"≸\",\"ntriangleleft\":\"⋪\",\"ntrianglelefteq\":\"⋬\",\"ntriangleright\":\"⋫\",\"ntrianglerighteq\":\"⋭\",\"Nu\":\"Ν\",\"nu\":\"ν\",\"num\":\"#\",\"numero\":\"№\",\"numsp\":\" \",\"nvap\":\"≍⃒\",\"nVDash\":\"⊯\",\"nVdash\":\"⊮\",\"nvDash\":\"⊭\",\"nvdash\":\"⊬\",\"nvge\":\"≥⃒\",\"nvgt\":\">⃒\",\"nvHarr\":\"⤄\",\"nvinfin\":\"⧞\",\"nvlArr\":\"⤂\",\"nvle\":\"≤⃒\",\"nvlt\":\"<⃒\",\"nvltrie\":\"⊴⃒\",\"nvrArr\":\"⤃\",\"nvrtrie\":\"⊵⃒\",\"nvsim\":\"∼⃒\",\"nwarhk\":\"⤣\",\"nwArr\":\"⇖\",\"nwarr\":\"↖\",\"nwarrow\":\"↖\",\"nwnear\":\"⤧\",\"Oacute\":\"Ó\",\"oacute\":\"ó\",\"oast\":\"⊛\",\"ocir\":\"⊚\",\"Ocirc\":\"Ô\",\"ocirc\":\"ô\",\"Ocy\":\"О\",\"ocy\":\"о\",\"odash\":\"⊝\",\"Odblac\":\"Ő\",\"odblac\":\"ő\",\"odiv\":\"⨸\",\"odot\":\"⊙\",\"odsold\":\"⦼\",\"OElig\":\"Œ\",\"oelig\":\"œ\",\"ofcir\":\"⦿\",\"Ofr\":\"𝔒\",\"ofr\":\"𝔬\",\"ogon\":\"˛\",\"Ograve\":\"Ò\",\"ograve\":\"ò\",\"ogt\":\"⧁\",\"ohbar\":\"⦵\",\"ohm\":\"Ω\",\"oint\":\"∮\",\"olarr\":\"↺\",\"olcir\":\"⦾\",\"olcross\":\"⦻\",\"oline\":\"‾\",\"olt\":\"⧀\",\"Omacr\":\"Ō\",\"omacr\":\"ō\",\"Omega\":\"Ω\",\"omega\":\"ω\",\"Omicron\":\"Ο\",\"omicron\":\"ο\",\"omid\":\"⦶\",\"ominus\":\"⊖\",\"Oopf\":\"𝕆\",\"oopf\":\"𝕠\",\"opar\":\"⦷\",\"OpenCurlyDoubleQuote\":\"“\",\"OpenCurlyQuote\":\"‘\",\"operp\":\"⦹\",\"oplus\":\"⊕\",\"Or\":\"⩔\",\"or\":\"∨\",\"orarr\":\"↻\",\"ord\":\"⩝\",\"order\":\"ℴ\",\"orderof\":\"ℴ\",\"ordf\":\"ª\",\"ordm\":\"º\",\"origof\":\"⊶\",\"oror\":\"⩖\",\"orslope\":\"⩗\",\"orv\":\"⩛\",\"oS\":\"Ⓢ\",\"Oscr\":\"𝒪\",\"oscr\":\"ℴ\",\"Oslash\":\"Ø\",\"oslash\":\"ø\",\"osol\":\"⊘\",\"Otilde\":\"Õ\",\"otilde\":\"õ\",\"Otimes\":\"⨷\",\"otimes\":\"⊗\",\"otimesas\":\"⨶\",\"Ouml\":\"Ö\",\"ouml\":\"ö\",\"ovbar\":\"⌽\",\"OverBar\":\"‾\",\"OverBrace\":\"⏞\",\"OverBracket\":\"⎴\",\"OverParenthesis\":\"⏜\",\"par\":\"∥\",\"para\":\"¶\",\"parallel\":\"∥\",\"parsim\":\"⫳\",\"parsl\":\"⫽\",\"part\":\"∂\",\"PartialD\":\"∂\",\"Pcy\":\"П\",\"pcy\":\"п\",\"percnt\":\"%\",\"period\":\".\",\"permil\":\"‰\",\"perp\":\"⊥\",\"pertenk\":\"‱\",\"Pfr\":\"𝔓\",\"pfr\":\"𝔭\",\"Phi\":\"Φ\",\"phi\":\"φ\",\"phiv\":\"ϕ\",\"phmmat\":\"ℳ\",\"phone\":\"☎\",\"Pi\":\"Π\",\"pi\":\"π\",\"pitchfork\":\"⋔\",\"piv\":\"ϖ\",\"planck\":\"ℏ\",\"planckh\":\"ℎ\",\"plankv\":\"ℏ\",\"plus\":\"+\",\"plusacir\":\"⨣\",\"plusb\":\"⊞\",\"pluscir\":\"⨢\",\"plusdo\":\"∔\",\"plusdu\":\"⨥\",\"pluse\":\"⩲\",\"PlusMinus\":\"±\",\"plusmn\":\"±\",\"plussim\":\"⨦\",\"plustwo\":\"⨧\",\"pm\":\"±\",\"Poincareplane\":\"ℌ\",\"pointint\":\"⨕\",\"Popf\":\"ℙ\",\"popf\":\"𝕡\",\"pound\":\"£\",\"Pr\":\"⪻\",\"pr\":\"≺\",\"prap\":\"⪷\",\"prcue\":\"≼\",\"prE\":\"⪳\",\"pre\":\"⪯\",\"prec\":\"≺\",\"precapprox\":\"⪷\",\"preccurlyeq\":\"≼\",\"Precedes\":\"≺\",\"PrecedesEqual\":\"⪯\",\"PrecedesSlantEqual\":\"≼\",\"PrecedesTilde\":\"≾\",\"preceq\":\"⪯\",\"precnapprox\":\"⪹\",\"precneqq\":\"⪵\",\"precnsim\":\"⋨\",\"precsim\":\"≾\",\"Prime\":\"″\",\"prime\":\"′\",\"primes\":\"ℙ\",\"prnap\":\"⪹\",\"prnE\":\"⪵\",\"prnsim\":\"⋨\",\"prod\":\"∏\",\"Product\":\"∏\",\"profalar\":\"⌮\",\"profline\":\"⌒\",\"profsurf\":\"⌓\",\"prop\":\"∝\",\"Proportion\":\"∷\",\"Proportional\":\"∝\",\"propto\":\"∝\",\"prsim\":\"≾\",\"prurel\":\"⊰\",\"Pscr\":\"𝒫\",\"pscr\":\"𝓅\",\"Psi\":\"Ψ\",\"psi\":\"ψ\",\"puncsp\":\" \",\"Qfr\":\"𝔔\",\"qfr\":\"𝔮\",\"qint\":\"⨌\",\"Qopf\":\"ℚ\",\"qopf\":\"𝕢\",\"qprime\":\"⁗\",\"Qscr\":\"𝒬\",\"qscr\":\"𝓆\",\"quaternions\":\"ℍ\",\"quatint\":\"⨖\",\"quest\":\"?\",\"questeq\":\"≟\",\"QUOT\":\"\\\"\",\"quot\":\"\\\"\",\"rAarr\":\"⇛\",\"race\":\"∽̱\",\"Racute\":\"Ŕ\",\"racute\":\"ŕ\",\"radic\":\"√\",\"raemptyv\":\"⦳\",\"Rang\":\"⟫\",\"rang\":\"⟩\",\"rangd\":\"⦒\",\"range\":\"⦥\",\"rangle\":\"⟩\",\"raquo\":\"»\",\"Rarr\":\"↠\",\"rArr\":\"⇒\",\"rarr\":\"→\",\"rarrap\":\"⥵\",\"rarrb\":\"⇥\",\"rarrbfs\":\"⤠\",\"rarrc\":\"⤳\",\"rarrfs\":\"⤞\",\"rarrhk\":\"↪\",\"rarrlp\":\"↬\",\"rarrpl\":\"⥅\",\"rarrsim\":\"⥴\",\"Rarrtl\":\"⤖\",\"rarrtl\":\"↣\",\"rarrw\":\"↝\",\"rAtail\":\"⤜\",\"ratail\":\"⤚\",\"ratio\":\"∶\",\"rationals\":\"ℚ\",\"RBarr\":\"⤐\",\"rBarr\":\"⤏\",\"rbarr\":\"⤍\",\"rbbrk\":\"❳\",\"rbrace\":\"}\",\"rbrack\":\"]\",\"rbrke\":\"⦌\",\"rbrksld\":\"⦎\",\"rbrkslu\":\"⦐\",\"Rcaron\":\"Ř\",\"rcaron\":\"ř\",\"Rcedil\":\"Ŗ\",\"rcedil\":\"ŗ\",\"rceil\":\"⌉\",\"rcub\":\"}\",\"Rcy\":\"Р\",\"rcy\":\"р\",\"rdca\":\"⤷\",\"rdldhar\":\"⥩\",\"rdquo\":\"”\",\"rdquor\":\"”\",\"rdsh\":\"↳\",\"Re\":\"ℜ\",\"real\":\"ℜ\",\"realine\":\"ℛ\",\"realpart\":\"ℜ\",\"reals\":\"ℝ\",\"rect\":\"▭\",\"REG\":\"®\",\"reg\":\"®\",\"ReverseElement\":\"∋\",\"ReverseEquilibrium\":\"⇋\",\"ReverseUpEquilibrium\":\"⥯\",\"rfisht\":\"⥽\",\"rfloor\":\"⌋\",\"Rfr\":\"ℜ\",\"rfr\":\"𝔯\",\"rHar\":\"⥤\",\"rhard\":\"⇁\",\"rharu\":\"⇀\",\"rharul\":\"⥬\",\"Rho\":\"Ρ\",\"rho\":\"ρ\",\"rhov\":\"ϱ\",\"RightAngleBracket\":\"⟩\",\"RightArrow\":\"→\",\"Rightarrow\":\"⇒\",\"rightarrow\":\"→\",\"RightArrowBar\":\"⇥\",\"RightArrowLeftArrow\":\"⇄\",\"rightarrowtail\":\"↣\",\"RightCeiling\":\"⌉\",\"RightDoubleBracket\":\"⟧\",\"RightDownTeeVector\":\"⥝\",\"RightDownVector\":\"⇂\",\"RightDownVectorBar\":\"⥕\",\"RightFloor\":\"⌋\",\"rightharpoondown\":\"⇁\",\"rightharpoonup\":\"⇀\",\"rightleftarrows\":\"⇄\",\"rightleftharpoons\":\"⇌\",\"rightrightarrows\":\"⇉\",\"rightsquigarrow\":\"↝\",\"RightTee\":\"⊢\",\"RightTeeArrow\":\"↦\",\"RightTeeVector\":\"⥛\",\"rightthreetimes\":\"⋌\",\"RightTriangle\":\"⊳\",\"RightTriangleBar\":\"⧐\",\"RightTriangleEqual\":\"⊵\",\"RightUpDownVector\":\"⥏\",\"RightUpTeeVector\":\"⥜\",\"RightUpVector\":\"↾\",\"RightUpVectorBar\":\"⥔\",\"RightVector\":\"⇀\",\"RightVectorBar\":\"⥓\",\"ring\":\"˚\",\"risingdotseq\":\"≓\",\"rlarr\":\"⇄\",\"rlhar\":\"⇌\",\"rlm\":\"‏\",\"rmoust\":\"⎱\",\"rmoustache\":\"⎱\",\"rnmid\":\"⫮\",\"roang\":\"⟭\",\"roarr\":\"⇾\",\"robrk\":\"⟧\",\"ropar\":\"⦆\",\"Ropf\":\"ℝ\",\"ropf\":\"𝕣\",\"roplus\":\"⨮\",\"rotimes\":\"⨵\",\"RoundImplies\":\"⥰\",\"rpar\":\")\",\"rpargt\":\"⦔\",\"rppolint\":\"⨒\",\"rrarr\":\"⇉\",\"Rrightarrow\":\"⇛\",\"rsaquo\":\"›\",\"Rscr\":\"ℛ\",\"rscr\":\"𝓇\",\"Rsh\":\"↱\",\"rsh\":\"↱\",\"rsqb\":\"]\",\"rsquo\":\"’\",\"rsquor\":\"’\",\"rthree\":\"⋌\",\"rtimes\":\"⋊\",\"rtri\":\"▹\",\"rtrie\":\"⊵\",\"rtrif\":\"▸\",\"rtriltri\":\"⧎\",\"RuleDelayed\":\"⧴\",\"ruluhar\":\"⥨\",\"rx\":\"℞\",\"Sacute\":\"Ś\",\"sacute\":\"ś\",\"sbquo\":\"‚\",\"Sc\":\"⪼\",\"sc\":\"≻\",\"scap\":\"⪸\",\"Scaron\":\"Š\",\"scaron\":\"š\",\"sccue\":\"≽\",\"scE\":\"⪴\",\"sce\":\"⪰\",\"Scedil\":\"Ş\",\"scedil\":\"ş\",\"Scirc\":\"Ŝ\",\"scirc\":\"ŝ\",\"scnap\":\"⪺\",\"scnE\":\"⪶\",\"scnsim\":\"⋩\",\"scpolint\":\"⨓\",\"scsim\":\"≿\",\"Scy\":\"С\",\"scy\":\"с\",\"sdot\":\"⋅\",\"sdotb\":\"⊡\",\"sdote\":\"⩦\",\"searhk\":\"⤥\",\"seArr\":\"⇘\",\"searr\":\"↘\",\"searrow\":\"↘\",\"sect\":\"§\",\"semi\":\";\",\"seswar\":\"⤩\",\"setminus\":\"∖\",\"setmn\":\"∖\",\"sext\":\"✶\",\"Sfr\":\"𝔖\",\"sfr\":\"𝔰\",\"sfrown\":\"⌢\",\"sharp\":\"♯\",\"SHCHcy\":\"Щ\",\"shchcy\":\"щ\",\"SHcy\":\"Ш\",\"shcy\":\"ш\",\"ShortDownArrow\":\"↓\",\"ShortLeftArrow\":\"←\",\"shortmid\":\"∣\",\"shortparallel\":\"∥\",\"ShortRightArrow\":\"→\",\"ShortUpArrow\":\"↑\",\"shy\":\"­\",\"Sigma\":\"Σ\",\"sigma\":\"σ\",\"sigmaf\":\"ς\",\"sigmav\":\"ς\",\"sim\":\"∼\",\"simdot\":\"⩪\",\"sime\":\"≃\",\"simeq\":\"≃\",\"simg\":\"⪞\",\"simgE\":\"⪠\",\"siml\":\"⪝\",\"simlE\":\"⪟\",\"simne\":\"≆\",\"simplus\":\"⨤\",\"simrarr\":\"⥲\",\"slarr\":\"←\",\"SmallCircle\":\"∘\",\"smallsetminus\":\"∖\",\"smashp\":\"⨳\",\"smeparsl\":\"⧤\",\"smid\":\"∣\",\"smile\":\"⌣\",\"smt\":\"⪪\",\"smte\":\"⪬\",\"smtes\":\"⪬︀\",\"SOFTcy\":\"Ь\",\"softcy\":\"ь\",\"sol\":\"/\",\"solb\":\"⧄\",\"solbar\":\"⌿\",\"Sopf\":\"𝕊\",\"sopf\":\"𝕤\",\"spades\":\"♠\",\"spadesuit\":\"♠\",\"spar\":\"∥\",\"sqcap\":\"⊓\",\"sqcaps\":\"⊓︀\",\"sqcup\":\"⊔\",\"sqcups\":\"⊔︀\",\"Sqrt\":\"√\",\"sqsub\":\"⊏\",\"sqsube\":\"⊑\",\"sqsubset\":\"⊏\",\"sqsubseteq\":\"⊑\",\"sqsup\":\"⊐\",\"sqsupe\":\"⊒\",\"sqsupset\":\"⊐\",\"sqsupseteq\":\"⊒\",\"squ\":\"□\",\"Square\":\"□\",\"square\":\"□\",\"SquareIntersection\":\"⊓\",\"SquareSubset\":\"⊏\",\"SquareSubsetEqual\":\"⊑\",\"SquareSuperset\":\"⊐\",\"SquareSupersetEqual\":\"⊒\",\"SquareUnion\":\"⊔\",\"squarf\":\"▪\",\"squf\":\"▪\",\"srarr\":\"→\",\"Sscr\":\"𝒮\",\"sscr\":\"𝓈\",\"ssetmn\":\"∖\",\"ssmile\":\"⌣\",\"sstarf\":\"⋆\",\"Star\":\"⋆\",\"star\":\"☆\",\"starf\":\"★\",\"straightepsilon\":\"ϵ\",\"straightphi\":\"ϕ\",\"strns\":\"¯\",\"Sub\":\"⋐\",\"sub\":\"⊂\",\"subdot\":\"⪽\",\"subE\":\"⫅\",\"sube\":\"⊆\",\"subedot\":\"⫃\",\"submult\":\"⫁\",\"subnE\":\"⫋\",\"subne\":\"⊊\",\"subplus\":\"⪿\",\"subrarr\":\"⥹\",\"Subset\":\"⋐\",\"subset\":\"⊂\",\"subseteq\":\"⊆\",\"subseteqq\":\"⫅\",\"SubsetEqual\":\"⊆\",\"subsetneq\":\"⊊\",\"subsetneqq\":\"⫋\",\"subsim\":\"⫇\",\"subsub\":\"⫕\",\"subsup\":\"⫓\",\"succ\":\"≻\",\"succapprox\":\"⪸\",\"succcurlyeq\":\"≽\",\"Succeeds\":\"≻\",\"SucceedsEqual\":\"⪰\",\"SucceedsSlantEqual\":\"≽\",\"SucceedsTilde\":\"≿\",\"succeq\":\"⪰\",\"succnapprox\":\"⪺\",\"succneqq\":\"⪶\",\"succnsim\":\"⋩\",\"succsim\":\"≿\",\"SuchThat\":\"∋\",\"Sum\":\"∑\",\"sum\":\"∑\",\"sung\":\"♪\",\"sup1\":\"¹\",\"sup2\":\"²\",\"sup3\":\"³\",\"Sup\":\"⋑\",\"sup\":\"⊃\",\"supdot\":\"⪾\",\"supdsub\":\"⫘\",\"supE\":\"⫆\",\"supe\":\"⊇\",\"supedot\":\"⫄\",\"Superset\":\"⊃\",\"SupersetEqual\":\"⊇\",\"suphsol\":\"⟉\",\"suphsub\":\"⫗\",\"suplarr\":\"⥻\",\"supmult\":\"⫂\",\"supnE\":\"⫌\",\"supne\":\"⊋\",\"supplus\":\"⫀\",\"Supset\":\"⋑\",\"supset\":\"⊃\",\"supseteq\":\"⊇\",\"supseteqq\":\"⫆\",\"supsetneq\":\"⊋\",\"supsetneqq\":\"⫌\",\"supsim\":\"⫈\",\"supsub\":\"⫔\",\"supsup\":\"⫖\",\"swarhk\":\"⤦\",\"swArr\":\"⇙\",\"swarr\":\"↙\",\"swarrow\":\"↙\",\"swnwar\":\"⤪\",\"szlig\":\"ß\",\"Tab\":\"\\t\",\"target\":\"⌖\",\"Tau\":\"Τ\",\"tau\":\"τ\",\"tbrk\":\"⎴\",\"Tcaron\":\"Ť\",\"tcaron\":\"ť\",\"Tcedil\":\"Ţ\",\"tcedil\":\"ţ\",\"Tcy\":\"Т\",\"tcy\":\"т\",\"tdot\":\"⃛\",\"telrec\":\"⌕\",\"Tfr\":\"𝔗\",\"tfr\":\"𝔱\",\"there4\":\"∴\",\"Therefore\":\"∴\",\"therefore\":\"∴\",\"Theta\":\"Θ\",\"theta\":\"θ\",\"thetasym\":\"ϑ\",\"thetav\":\"ϑ\",\"thickapprox\":\"≈\",\"thicksim\":\"∼\",\"ThickSpace\":\"  \",\"thinsp\":\" \",\"ThinSpace\":\" \",\"thkap\":\"≈\",\"thksim\":\"∼\",\"THORN\":\"Þ\",\"thorn\":\"þ\",\"Tilde\":\"∼\",\"tilde\":\"˜\",\"TildeEqual\":\"≃\",\"TildeFullEqual\":\"≅\",\"TildeTilde\":\"≈\",\"times\":\"×\",\"timesb\":\"⊠\",\"timesbar\":\"⨱\",\"timesd\":\"⨰\",\"tint\":\"∭\",\"toea\":\"⤨\",\"top\":\"⊤\",\"topbot\":\"⌶\",\"topcir\":\"⫱\",\"Topf\":\"𝕋\",\"topf\":\"𝕥\",\"topfork\":\"⫚\",\"tosa\":\"⤩\",\"tprime\":\"‴\",\"TRADE\":\"™\",\"trade\":\"™\",\"triangle\":\"▵\",\"triangledown\":\"▿\",\"triangleleft\":\"◃\",\"trianglelefteq\":\"⊴\",\"triangleq\":\"≜\",\"triangleright\":\"▹\",\"trianglerighteq\":\"⊵\",\"tridot\":\"◬\",\"trie\":\"≜\",\"triminus\":\"⨺\",\"TripleDot\":\"⃛\",\"triplus\":\"⨹\",\"trisb\":\"⧍\",\"tritime\":\"⨻\",\"trpezium\":\"⏢\",\"Tscr\":\"𝒯\",\"tscr\":\"𝓉\",\"TScy\":\"Ц\",\"tscy\":\"ц\",\"TSHcy\":\"Ћ\",\"tshcy\":\"ћ\",\"Tstrok\":\"Ŧ\",\"tstrok\":\"ŧ\",\"twixt\":\"≬\",\"twoheadleftarrow\":\"↞\",\"twoheadrightarrow\":\"↠\",\"Uacute\":\"Ú\",\"uacute\":\"ú\",\"Uarr\":\"↟\",\"uArr\":\"⇑\",\"uarr\":\"↑\",\"Uarrocir\":\"⥉\",\"Ubrcy\":\"Ў\",\"ubrcy\":\"ў\",\"Ubreve\":\"Ŭ\",\"ubreve\":\"ŭ\",\"Ucirc\":\"Û\",\"ucirc\":\"û\",\"Ucy\":\"У\",\"ucy\":\"у\",\"udarr\":\"⇅\",\"Udblac\":\"Ű\",\"udblac\":\"ű\",\"udhar\":\"⥮\",\"ufisht\":\"⥾\",\"Ufr\":\"𝔘\",\"ufr\":\"𝔲\",\"Ugrave\":\"Ù\",\"ugrave\":\"ù\",\"uHar\":\"⥣\",\"uharl\":\"↿\",\"uharr\":\"↾\",\"uhblk\":\"▀\",\"ulcorn\":\"⌜\",\"ulcorner\":\"⌜\",\"ulcrop\":\"⌏\",\"ultri\":\"◸\",\"Umacr\":\"Ū\",\"umacr\":\"ū\",\"uml\":\"¨\",\"UnderBar\":\"_\",\"UnderBrace\":\"⏟\",\"UnderBracket\":\"⎵\",\"UnderParenthesis\":\"⏝\",\"Union\":\"⋃\",\"UnionPlus\":\"⊎\",\"Uogon\":\"Ų\",\"uogon\":\"ų\",\"Uopf\":\"𝕌\",\"uopf\":\"𝕦\",\"UpArrow\":\"↑\",\"Uparrow\":\"⇑\",\"uparrow\":\"↑\",\"UpArrowBar\":\"⤒\",\"UpArrowDownArrow\":\"⇅\",\"UpDownArrow\":\"↕\",\"Updownarrow\":\"⇕\",\"updownarrow\":\"↕\",\"UpEquilibrium\":\"⥮\",\"upharpoonleft\":\"↿\",\"upharpoonright\":\"↾\",\"uplus\":\"⊎\",\"UpperLeftArrow\":\"↖\",\"UpperRightArrow\":\"↗\",\"Upsi\":\"ϒ\",\"upsi\":\"υ\",\"upsih\":\"ϒ\",\"Upsilon\":\"Υ\",\"upsilon\":\"υ\",\"UpTee\":\"⊥\",\"UpTeeArrow\":\"↥\",\"upuparrows\":\"⇈\",\"urcorn\":\"⌝\",\"urcorner\":\"⌝\",\"urcrop\":\"⌎\",\"Uring\":\"Ů\",\"uring\":\"ů\",\"urtri\":\"◹\",\"Uscr\":\"𝒰\",\"uscr\":\"𝓊\",\"utdot\":\"⋰\",\"Utilde\":\"Ũ\",\"utilde\":\"ũ\",\"utri\":\"▵\",\"utrif\":\"▴\",\"uuarr\":\"⇈\",\"Uuml\":\"Ü\",\"uuml\":\"ü\",\"uwangle\":\"⦧\",\"vangrt\":\"⦜\",\"varepsilon\":\"ϵ\",\"varkappa\":\"ϰ\",\"varnothing\":\"∅\",\"varphi\":\"ϕ\",\"varpi\":\"ϖ\",\"varpropto\":\"∝\",\"vArr\":\"⇕\",\"varr\":\"↕\",\"varrho\":\"ϱ\",\"varsigma\":\"ς\",\"varsubsetneq\":\"⊊︀\",\"varsubsetneqq\":\"⫋︀\",\"varsupsetneq\":\"⊋︀\",\"varsupsetneqq\":\"⫌︀\",\"vartheta\":\"ϑ\",\"vartriangleleft\":\"⊲\",\"vartriangleright\":\"⊳\",\"Vbar\":\"⫫\",\"vBar\":\"⫨\",\"vBarv\":\"⫩\",\"Vcy\":\"В\",\"vcy\":\"в\",\"VDash\":\"⊫\",\"Vdash\":\"⊩\",\"vDash\":\"⊨\",\"vdash\":\"⊢\",\"Vdashl\":\"⫦\",\"Vee\":\"⋁\",\"vee\":\"∨\",\"veebar\":\"⊻\",\"veeeq\":\"≚\",\"vellip\":\"⋮\",\"Verbar\":\"‖\",\"verbar\":\"|\",\"Vert\":\"‖\",\"vert\":\"|\",\"VerticalBar\":\"∣\",\"VerticalLine\":\"|\",\"VerticalSeparator\":\"❘\",\"VerticalTilde\":\"≀\",\"VeryThinSpace\":\" \",\"Vfr\":\"𝔙\",\"vfr\":\"𝔳\",\"vltri\":\"⊲\",\"vnsub\":\"⊂⃒\",\"vnsup\":\"⊃⃒\",\"Vopf\":\"𝕍\",\"vopf\":\"𝕧\",\"vprop\":\"∝\",\"vrtri\":\"⊳\",\"Vscr\":\"𝒱\",\"vscr\":\"𝓋\",\"vsubnE\":\"⫋︀\",\"vsubne\":\"⊊︀\",\"vsupnE\":\"⫌︀\",\"vsupne\":\"⊋︀\",\"Vvdash\":\"⊪\",\"vzigzag\":\"⦚\",\"Wcirc\":\"Ŵ\",\"wcirc\":\"ŵ\",\"wedbar\":\"⩟\",\"Wedge\":\"⋀\",\"wedge\":\"∧\",\"wedgeq\":\"≙\",\"weierp\":\"℘\",\"Wfr\":\"𝔚\",\"wfr\":\"𝔴\",\"Wopf\":\"𝕎\",\"wopf\":\"𝕨\",\"wp\":\"℘\",\"wr\":\"≀\",\"wreath\":\"≀\",\"Wscr\":\"𝒲\",\"wscr\":\"𝓌\",\"xcap\":\"⋂\",\"xcirc\":\"◯\",\"xcup\":\"⋃\",\"xdtri\":\"▽\",\"Xfr\":\"𝔛\",\"xfr\":\"𝔵\",\"xhArr\":\"⟺\",\"xharr\":\"⟷\",\"Xi\":\"Ξ\",\"xi\":\"ξ\",\"xlArr\":\"⟸\",\"xlarr\":\"⟵\",\"xmap\":\"⟼\",\"xnis\":\"⋻\",\"xodot\":\"⨀\",\"Xopf\":\"𝕏\",\"xopf\":\"𝕩\",\"xoplus\":\"⨁\",\"xotime\":\"⨂\",\"xrArr\":\"⟹\",\"xrarr\":\"⟶\",\"Xscr\":\"𝒳\",\"xscr\":\"𝓍\",\"xsqcup\":\"⨆\",\"xuplus\":\"⨄\",\"xutri\":\"△\",\"xvee\":\"⋁\",\"xwedge\":\"⋀\",\"Yacute\":\"Ý\",\"yacute\":\"ý\",\"YAcy\":\"Я\",\"yacy\":\"я\",\"Ycirc\":\"Ŷ\",\"ycirc\":\"ŷ\",\"Ycy\":\"Ы\",\"ycy\":\"ы\",\"yen\":\"¥\",\"Yfr\":\"𝔜\",\"yfr\":\"𝔶\",\"YIcy\":\"Ї\",\"yicy\":\"ї\",\"Yopf\":\"𝕐\",\"yopf\":\"𝕪\",\"Yscr\":\"𝒴\",\"yscr\":\"𝓎\",\"YUcy\":\"Ю\",\"yucy\":\"ю\",\"Yuml\":\"Ÿ\",\"yuml\":\"ÿ\",\"Zacute\":\"Ź\",\"zacute\":\"ź\",\"Zcaron\":\"Ž\",\"zcaron\":\"ž\",\"Zcy\":\"З\",\"zcy\":\"з\",\"Zdot\":\"Ż\",\"zdot\":\"ż\",\"zeetrf\":\"ℨ\",\"ZeroWidthSpace\":\"​\",\"Zeta\":\"Ζ\",\"zeta\":\"ζ\",\"Zfr\":\"ℨ\",\"zfr\":\"𝔷\",\"ZHcy\":\"Ж\",\"zhcy\":\"ж\",\"zigrarr\":\"⇝\",\"Zopf\":\"ℤ\",\"zopf\":\"𝕫\",\"Zscr\":\"𝒵\",\"zscr\":\"𝓏\",\"zwj\":\"‍\",\"zwnj\":\"‌\"}");

const SPACE = 32, TAB = 9, LF = 10, CR = 13;

// Persistent inLink state (marked's lexer state): an inline opening <a>
// tag (startATag /^<a /i) sets it, a closing </a> (endATag /^<\/a>/i)
// clears it, and bare extended autolinks do not form while it is set. It
// persists across blocks within one parse() call and is reset at the start
// of parse(). HTML blocks never set it (their text is not inline-tokenized),
// so only a multi-line <a> tag (one that is not a complete tag on its own
// line, hence a paragraph) can leave inLink set for later paragraphs.
let inLink = false;

// ---- character classes -------------------------------------------------
function isSpaceCh(c) { return c === 32 || c === 9 || c === 10 || c === 13 || c === 11 || c === 12; }
// ASCII punctuation (CommonMark): !"#$%&'()*+,-./:;<=>?@[\]^_`{|}~
function isAsciiPunct(code) {
  return (code >= 33 && code <= 47) || (code >= 58 && code <= 64) ||
    (code >= 91 && code <= 96) || (code >= 123 && code <= 126);
}
const UNICODE_PUNCT_RE = /\p{P}/u;
const UNICODE_SYMBOL_RE = /\p{S}/u;
const UNICODE_PUNCT_SYM_RE = /[\p{P}\p{S}]/u;
function isPunctCh(ch) {
  const code = ch.charCodeAt(0);
  if (code < 128) return isAsciiPunct(code);
  return UNICODE_PUNCT_SYM_RE.test(ch);
}
// Punctuation by code point (for flanking): ASCII punctuation, or a
// Unicode punctuation/symbol character.
function isPunctCp(cp) {
  if (cp < 128) return isAsciiPunct(cp);
  return UNICODE_PUNCT_SYM_RE.test(String.fromCodePoint(cp));
}
// Unicode whitespace (CommonMark): space, tab, LF, FF, CR, NBSP, U+1680,
// U+2000-200A, U+2028, U+2029, U+202F, U+205F, U+3000, plus U+FEFF (which
// JavaScript's \s counts, and which marked's delimiter regexes count).
function isUnicodeWsCh(ch) {
  const code = ch.charCodeAt(0);
  return code === 32 || code === 9 || code === 10 || code === 11 || code === 12 || code === 13 ||
    code === 160 || code === 0x1680 || (code >= 0x2000 && code <= 0x200a) ||
    code === 0x2028 || code === 0x2029 || code === 0x202f || code === 0x205f || code === 0x3000 ||
    code === 0xfeff;
}
function isWsCp(cp) {
  return cp === 32 || cp === 9 || cp === 10 || cp === 11 || cp === 12 || cp === 13 ||
    cp === 160 || cp === 0x1680 || (cp >= 0x2000 && cp <= 0x200a) ||
    cp === 0x2028 || cp === 0x2029 || cp === 0x202f || cp === 0x205f || cp === 0x3000 ||
    cp === 0xfeff;
}

// ---- escaping ----------------------------------------------------------
// Text escape (marked's escape with encode): & < > " ' are always escaped.
function escText(s) {
  let out = '', start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    let rep = null;
    if (c === 38) rep = '&amp;';
    else if (c === 60) rep = '&lt;';
    else if (c === 62) rep = '&gt;';
    else if (c === 34) rep = '&quot;';
    else if (c === 39) rep = '&#39;';
    if (rep !== null) { out += s.slice(start, i) + rep; start = i + 1; }
  }
  return start === 0 ? s : out + s.slice(start);
}
// Attribute escape (marked's escape without encode): < > " ' always, and &
// only when it does not start a valid entity reference (&name; / &#123; /
// &#x1a;). Used for hrefs and titles, whose raw text keeps entities intact.
const ENT_REF_RE = /^(?:#\d{1,7}|#[Xx][0-9A-Fa-f]{1,6}|\w+);/;
function escAttr(s) {
  let out = '', start = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    let rep = null;
    if (c === 38) {
      if (!ENT_REF_RE.test(s.slice(i + 1))) rep = '&amp;';
    } else if (c === 60) rep = '&lt;';
    else if (c === 62) rep = '&gt;';
    else if (c === 34) rep = '&quot;';
    else if (c === 39) rep = '&#39;';
    if (rep !== null) { out += s.slice(start, i) + rep; start = i + 1; }
  }
  return start === 0 ? s : out + s.slice(start);
}
// A link destination: unescape backslash-escaped punctuation, percent-encode
// with encodeURI (marked does not sanitise schemes; a literal % stays %),
// then attribute-escape. Returns null when encodeURI throws (lone
// surrogate in the destination); marked then renders the link text bare.
function cleanUrl(raw) {
  let d = raw;
  if (d.indexOf('\\') !== -1) d = d.replace(/\\([!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~])/g, '$1');
  try { d = encodeURI(d).replace(/%25/g, '%'); } catch (e) { return null; }
  return d;
}
function cleanHref(raw) {
  const d = cleanUrl(raw);
  return d === null ? null : escAttr(d);
}
function cleanTitle(raw) {
  let t = raw;
  if (t.indexOf('\\') !== -1) t = t.replace(/\\([!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~])/g, '$1');
  return escAttr(t);
}

// ---- tabs --------------------------------------------------------------
// Expand the leading whitespace of `s` (spaces and tabs only, `s` is that
// whitespace run) to spaces, starting at column `base`. A tab advances to
// the next multiple of 4. (marked's J helper.)
function expandWs(ws, base) {
  let col = base, out = '';
  for (let i = 0; i < ws.length; i++) {
    const ch = ws[i];
    if (ch === '\t') { const r = 4 - (col % 4); out += '    '.slice(0, r); col += r; }
    else { out += ch; col++; }
  }
  return out;
}
// Column width of the leading whitespace of a line (spaces=1, tab to next
// multiple of 4), and the index of the first non-whitespace character.
function leadingWsInfo(s) {
  let col = 0, i = 0;
  for (; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 32) col++;
    else if (c === 9) col += 4 - (col % 4);
    else break;
  }
  return { col, idx: i };
}
// Remove `n` columns from the start of a line (spaces=1 col, tabs to the
// next multiple of 4); a tab straddling the cut becomes spaces for the
// remainder. Returns the remaining string.
function stripCols(s, n) {
  let col = 0, i = 0;
  for (; i < s.length && col < n; i++) {
    const c = s.charCodeAt(i);
    if (c === 32) col++;
    else if (c === 9) {
      const w = 4 - (col % 4);
      if (col + w > n) return ' '.repeat(col + w - n) + s.slice(i + 1);
      col += w;
    } else break;
  }
  return s.slice(i);
}
// Indented-code indent removal (marked's codeRemoveIndent): per line remove
// up to 3 spaces + a tab, or 1-4 spaces.
function removeCodeIndent(line) {
  let i = 0, spaces = 0;
  while (i < line.length && line.charCodeAt(i) === 32 && spaces < 3) { i++; spaces++; }
  if (i < line.length && line.charCodeAt(i) === 9) return line.slice(i + 1);
  let j = 0;
  while (j < line.length && line.charCodeAt(j) === 32 && j < 4) j++;
  return j > 0 ? line.slice(j) : line;
}
function isBlankLine(s) {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c !== 32 && c !== 9) return false;
  }
  return true;
}
// Decode one entity reference starting at s[i] === '&'. Returns
// {ch, end} (end = index after ';') or null.
function parseEntity(s, i) {
  const n = s.length;
  if (i + 1 >= n) return null;
  if (s[i + 1] === '#') {
    let j = i + 2, hex = false;
    if (j < n && (s[j] === 'x' || s[j] === 'X')) { hex = true; j++; }
    const start = j;
    while (j < n) {
      const c = s.charCodeAt(j);
      if (hex ? (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102) : (c >= 48 && c <= 57)) j++;
      else break;
    }
    if (j === start || j >= n || s[j] !== ';') return null;
    const cp = parseInt(s.slice(start, j), hex ? 16 : 10);
    if (cp === 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return { ch: '\uFFFD', end: j + 1 };
    return { ch: String.fromCodePoint(cp), end: j + 1 };
  }
  let j = i + 1;
  while (j < n) {
    const c = s.charCodeAt(j);
    if ((c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122)) j++;
    else break;
  }
  if (j >= n || s[j] !== ';' || j === i + 1) return null;
  const name = s.slice(i + 1, j);
  const v = ENT[name];
  if (typeof v !== 'string') return null;
  return { ch: v, end: j + 1 };
}
// Normalise a link label: collapse whitespace (incl. newlines) to one space,
// trim, lowercase. Backslash-escaped brackets are unescaped first so that
// definitions and references match the same way.
function normalizeLabel(raw) {
  let s = raw.replace(/\\([\[\]])/g, '$1');
  s = s.replace(/[ \t\r\n]+/g, ' ').trim().toLowerCase();
  // Unicode case folding (not just lowercasing): ß/ẞ fold to "ss", and the
  // Latin ligatures fold to their expansions
  s = s.replace(/ß/g, 'ss')
    .replace(/ﬀ/g, 'ff').replace(/ﬁ/g, 'fi').replace(/ﬂ/g, 'fl')
    .replace(/ﬃ/g, 'ffi').replace(/ﬄ/g, 'ffl')
    .replace(/ﬅ/g, 'st').replace(/ﬆ/g, 'st');
  return s;
}

// ---- link reference definitions ----------------------------------------
// Parse a link reference definition starting at lines[i]. Returns
// {end, label, dest, title} (end = index of the first line after the def)
// or null. The definition may span lines: the destination and the title may
// each sit on a following line. Only called where a definition may start
// (at the start of a paragraph, before any text line).
function tryParseDef(lines, i, end) {
  const s0 = lines[i].s;
  const info0 = leadingWsInfo(s0);
  if (info0.col > 3 || s0[info0.idx] !== '[') return null;
  // find the matching ']' for the label (escapes allowed); the label may
  // span lines (but not blank ones). A label cannot contain an unescaped
  // '[' (nested brackets make the definition invalid in marked).
  const labelParts = [];
  let found = false, labelEndLi = i, labelEndCol = -1;
  let lli = i, lcol = info0.idx + 1;
  while (lli < end) {
    const ls = lines[lli].s;
    while (lcol < ls.length) {
      const c = ls[lcol];
      if (c === '\\' && lcol + 1 < ls.length) { labelParts.push(c, ls[lcol + 1]); lcol += 2; continue; }
      if (c === '[') return null;
      if (c === ']') { labelEndLi = lli; labelEndCol = lcol; found = true; break; }
      labelParts.push(c);
      lcol++;
    }
    if (found) break;
    if (lli + 1 >= end || isBlankLine(lines[lli + 1].s)) break;
    labelParts.push('\n');
    lli++; lcol = 0;
  }
  if (!found) return null;
  const rawLabel = labelParts.join('');
  if (rawLabel.length === 0 || rawLabel.length > 999) return null;
  const normLabel = normalizeLabel(rawLabel);
  if (normLabel.length === 0) return null;
  // after ']' must come ':' (only whitespace may intervene, same line)
  const sE = lines[labelEndLi].s;
  let p = labelEndCol + 1;
  while (p < sE.length && (sE[p] === ' ' || sE[p] === '\t')) p++;
  if (p >= sE.length || sE[p] !== ':') return null;
  p++;
  // the base line for the 2-line limit is the ':' line
  const baseLine = labelEndLi;
  // Cursor over (line, col); whitespace (incl. newlines) may be skipped
  // between the parts, but never across a blank line, and at most 2 lines
  // past the ':' line (dest line, title line).
  let li = labelEndLi, col = p;
  const skipWs = () => {
    while (true) {
      const s = lines[li].s;
      while (col < s.length && (s[col] === ' ' || s[col] === '\t')) col++;
      if (col < s.length) return true;
      // end of line: move to the next line if it exists, is non-blank and
      // within range
      if (li + 1 >= end || li + 1 > baseLine + 2) return false;
      const ns = lines[li + 1].s;
      if (isBlankLine(ns)) return false;
      li++; col = 0;
    }
  };
  if (!skipWs()) return null;
  // destination
  let dest = '';
  let s = lines[li].s;
  if (s[col] === '<') {
    let k = col + 1, ok = false;
    for (; k < s.length; k++) {
      const c = s[k];
      if (c === '\n') break;
      if (c === '\\' && k + 1 < s.length) { k++; continue; }
      if (c === '<') break;
      if (c === '>') { ok = true; break; }
    }
    if (!ok) return null;
    dest = s.slice(col + 1, k);
    col = k + 1;
  } else {
    // bare destination: no spaces, balanced parens, backslash escapes
    let k = col, depth = 0, ok = false;
    for (; k < s.length; k++) {
      const c = s[k];
      if (c === ' ' || c === '\t') break;
      if (c === '\\' && k + 1 < s.length) { k++; continue; }
      if (c === '(') depth++;
      else if (c === ')') { if (depth === 0) break; depth--; }
    }
    if (k === col) return null;
    dest = s.slice(col, k);
    col = k;
    // an unmatched '(' makes the destination invalid (marked's ke() check)
    if (depth > 0) return null;
  }
  // optional title
  let title = null;
  // skip whitespace on the same line / following lines (not across blanks)
  let saveLi = li, saveCol = col;
  if (skipWs()) {
    s = lines[li].s;
    const q = s[col];
    // a title must be separated from the destination by whitespace
    if ((q === '"' || q === "'" || q === '(') && li === saveLi && col === saveCol) return null;
    if (q === '"' || q === "'" || q === '(') {
      const close = q === '(' ? ')' : q;
      let k = col + 1, ok = false;
      // a title may span lines (but not blank ones)
      let tli = li, tcol = k;
      let titleText = '';
      while (true) {
        const ts = lines[tli].s;
        let found = -1;
        for (let m = tcol; m < ts.length; m++) {
          const c = ts[m];
          if (c === '\\' && m + 1 < ts.length) { m++; continue; }
          if (c === close) { found = m; break; }
        }
        if (found !== -1) {
          titleText += ts.slice(tcol, found);
          tli = tli; tcol = found + 1;
          ok = true;
          break;
        }
        titleText += ts.slice(tcol) + '\n';
        if (tli + 1 >= end || isBlankLine(lines[tli + 1].s)) break;
        tli++; tcol = 0;
      }
      if (ok) {
        // after the title only whitespace may follow on that line; junk
        // after it means there is no title (the def still ends at the dest)
        const ts = lines[tli].s;
        let m = tcol;
        while (m < ts.length && (ts[m] === ' ' || ts[m] === '\t')) m++;
        if (m < ts.length) {
          li = saveLi; col = saveCol;
          title = null;
        } else {
          title = titleText;
          li = tli; col = m;
        }
      } else {
        // no closing quote: the title is invalid, so the whole def fails
        // unless there was no title at all (restore and finish without one)
        li = saveLi; col = saveCol;
        title = null;
        // but if the next char really starts a quote/paren, the def is bad
        if (q === '"' || q === "'" || q === '(') return null;
      }
    } else {
      // Something else after the destination: the definition simply ends
      // at the destination (the next line starts a new block).
      li = saveLi; col = saveCol;
    }
  } else {
    li = saveLi; col = saveCol;
  }
  // the definition must end at the end of its last line (only ws follows)
  s = lines[li].s;
  let m = col;
  while (m < s.length && (s[m] === ' ' || s[m] === '\t')) m++;
  if (m < s.length) return null;
  return { end: li + 1, label: normLabel, dest, title };
}

// ---- block-level helpers ------------------------------------------------
const BLOCK_TAGS = new Set(('address article aside base basefont blockquote body caption center col colgroup dd details dialog dir div dl dt fieldset figcaption figure footer form frame frameset h1 h2 h3 h4 h5 h6 head header hr html iframe legend li link main menu menuitem meta nav noframes ol optgroup option p param search section summary table tbody td tfoot th thead title tr track ul').split(' '));
const TYPE1_TAGS = new Set(['script', 'pre', 'style', 'textarea']);

function fenceStart(s, ind) {
  const c = s[ind];
  if (c !== '`' && c !== '~') return null;
  let n = 0, i = ind;
  while (i < s.length && s[i] === c) { n++; i++; }
  if (n < 3) return null;
  const info = s.slice(i);
  if (c === '`' && info.indexOf('`') !== -1) return null;
  return { ch: c, n, info: info.trim(), indentChars: ind };
}
function isFenceEnd(s, ind, ch, n) {
  if (ind > 3) return false;
  const c = s[ind];
  if (c !== ch) return false;
  let k = 0, i = ind;
  while (i < s.length && s[i] === ch) { k++; i++; }
  if (k < n) return false;
  while (i < s.length && (s[i] === ' ' || s[i] === '\t')) i++;
  return i === s.length;
}
function atxHeading(s, ind) {
  if (s[ind] !== '#') return null;
  let n = 0, i = ind;
  while (i < s.length && s[i] === '#') { n++; i++; }
  if (n > 6) return null;
  if (i < s.length && s[i] !== ' ' && s[i] !== '\t') return null;
  let text = s.slice(i).trim();
  // strip a closing sequence of #'s preceded by a space (or the whole
  // text, when it is only #'s: '### ###' is an empty h3)
  let e = text.length;
  while (e > 0 && text[e - 1] === '#') e--;
  if (e < text.length && (e === 0 || text[e - 1] === ' ' || text[e - 1] === '\t')) {
    text = text.slice(0, e).trim();
  }
  return { level: n, text };
}
function isThematicBreak(s, ind) {
  const c = s[ind];
  if (c !== '*' && c !== '-' && c !== '_') return false;
  let count = 0, i = ind;
  for (; i < s.length; i++) {
    const ch = s[i];
    if (ch === c) count++;
    else if (ch !== ' ' && ch !== '\t') return false;
  }
  return count >= 3;
}
function isSetextLine(s, ind) {
  const c = s[ind];
  if (c !== '=' && c !== '-') return false;
  let i = ind;
  while (i < s.length && s[i] === c) i++;
  if (i === ind) return false;
  // only trailing spaces/tabs may follow (no spaces between the marks)
  while (i < s.length && (s[i] === ' ' || s[i] === '\t')) i++;
  return i === s.length;
}
// HTML block start. Returns {type, endRe} or null. type 1-5 end at a line
// containing the terminator; types 6-7 end at a blank line. Type 7 may not
// interrupt a paragraph (the caller handles that).
function htmlBlockStart(s, ind) {
  if (s[ind] !== '<') return null;
  const rest = s.slice(ind + 1);
  const lower = rest.toLowerCase();
  // type 1: script, pre, style, textarea
  for (const tag of TYPE1_TAGS) {
    if (lower.startsWith(tag)) {
      const nx = lower[tag.length];
      if (nx === undefined || nx === ' ' || nx === '\t' || nx === '>' || nx === '/') {
        return { type: 1, tag };
      }
    }
  }
  if (rest.startsWith('!--')) return { type: 2, term: '-->' };
  if (rest.startsWith('![CDATA[')) return { type: 5, term: ']]>' };
  if (rest.startsWith('?')) return { type: 3, term: '?>' };
  if (rest.startsWith('!')) {
    const c = rest[1];
    if (c >= 'A' && c <= 'Z' || c >= 'a' && c <= 'z') return { type: 4, term: '>' };
    return null;
  }
  // open or close tag
  let p = 0, closing = false;
  if (rest[p] === '/') { closing = true; p++; }
  const nameStart = p;
  if (p >= rest.length || !(rest[p] >= 'a' && rest[p] <= 'z' || rest[p] >= 'A' && rest[p] <= 'Z')) return null;
  while (p < rest.length) {
    const c = rest[p];
    if (c >= 'a' && c <= 'z' || c >= 'A' && c <= 'Z' || c >= '0' && c <= '9' || c === '-') p++;
    else break;
  }
  const name = rest.slice(nameStart, p).toLowerCase();
  const nx = rest[p];
  if (!(nx === undefined || nx === ' ' || nx === '\t' || nx === '>' || nx === '/')) return null;
  if (BLOCK_TAGS.has(name)) return { type: 6, tag: name };
  // type 7: the tag must be complete on this line, with valid attributes,
  // and only spaces/tabs may follow the '>'
  if (completeTagEnd(s, ind) === -1) return null;
  return { type: 7, tag: name };
}

// For a type 7 HTML block: the tag must be complete on this line, with
// valid attributes, and only spaces/tabs may follow the '>'. Returns the
// index just after '>' or -1.
function completeTagEnd(s, ind) {
  let p = ind + 1;
  let closing = false;
  if (s[p] === '/') { closing = true; p++; }
  if (p >= s.length) return -1;
  const c0 = s.charCodeAt(p);
  if (!((c0 >= 65 && c0 <= 90) || (c0 >= 97 && c0 <= 122))) return -1;
  p++;
  while (p < s.length) {
    const c = s.charCodeAt(p);
    if (isAlnum(c) || c === 45) p++;
    else break;
  }
  if (closing) {
    // a closing tag allows only whitespace then '>' (no attributes)
    let q = p;
    while (q < s.length && (s[q] === ' ' || s[q] === '\t')) q++;
    if (s[q] !== '>') return -1;
    let r = q + 1;
    while (r < s.length && (s[r] === ' ' || s[r] === '\t')) r++;
    return r === s.length ? q + 1 : -1;
  }
  while (true) {
    let q = p;
    while (q < s.length && (s[q] === ' ' || s[q] === '\t')) q++;
    if (q >= s.length) return -1;
    if (s[q] === '>') {
      let r = q + 1;
      while (r < s.length && (s[r] === ' ' || s[r] === '\t')) r++;
      return r === s.length ? q + 1 : -1;
    }
    if (s[q] === '/' && s[q + 1] === '>') {
      let r = q + 2;
      while (r < s.length && (s[r] === ' ' || s[r] === '\t')) r++;
      return r === s.length ? q + 2 : -1;
    }
    if (q === p) return -1;
    // attribute name: [a-zA-Z:_][\w.:-]*
    const nc = s.charCodeAt(q);
    if (!((nc >= 65 && nc <= 90) || (nc >= 97 && nc <= 122) || nc === 95 || nc === 58)) return -1;
    q++;
    while (q < s.length) {
      const c = s.charCodeAt(q);
      if (isAlnum(c) || c === 95 || c === 46 || c === 58 || c === 45) q++;
      else break;
    }
    let r = q;
    while (r < s.length && (s[r] === ' ' || s[r] === '\t')) r++;
    if (s[r] === '=') {
      r++;
      while (r < s.length && (s[r] === ' ' || s[r] === '\t')) r++;
      if (s[r] === '"') {
        r++;
        while (r < s.length && s[r] !== '"') r++;
        if (r >= s.length) return -1;
        r++;
      } else if (s[r] === "'") {
        r++;
        while (r < s.length && s[r] !== "'") r++;
        if (r >= s.length) return -1;
        r++;
      } else {
        const start = r;
        while (r < s.length) {
          const c = s[r];
          if (c === ' ' || c === '\t' || c === '"' || c === "'" || c === '=' || c === '<' || c === '>' || c === '`') break;
          r++;
        }
        if (r === start) return -1;
      }
      p = r;
    } else {
      // no value: do not consume the following whitespace here
      p = q;
    }
  }
}
function htmlBlockEnd(line, hb) {
  switch (hb.type) {
    case 1: return line.toLowerCase().indexOf('</' + hb.tag) !== -1;
    case 2: return line.indexOf('-->') !== -1;
    case 3: return line.indexOf('?>') !== -1;
    case 4: return line.indexOf('>') !== -1;
    case 5: return line.indexOf(']]>') !== -1;
    default: return false;
  }
}
// List marker at lines[i] (indent <= 3). Returns null or
// {bullet, ordered, delim, start, markerLen, contentIndent} where
// contentIndent is the column (relative to the line start) of the item's
// content, computed from the whitespace after the marker.
function listStart(s, ind) {
  const c = s[ind];
  let markerLen, ordered = false, delim = '', start = 0;
  if (c === '-' || c === '+' || c === '*') {
    markerLen = 1;
  } else if (c >= '0' && c <= '9') {
    let i = ind;
    while (i < s.length && s[i] >= '0' && s[i] <= '9') i++;
    if (i - ind > 9) return null;
    if (i >= s.length || (s[i] !== '.' && s[i] !== ')')) return null;
    delim = s[i]; start = parseInt(s.slice(ind, i), 10);
    markerLen = (i - ind) + 1; ordered = true;
  } else return null;
  const after = ind + markerLen;
  if (after >= s.length) {
    // marker alone on the line: empty item, content indent = marker + 1
    return { bullet: c, ordered, delim, start, markerLen, contentIndent: ind + markerLen + 1, empty: true };
  }
  const nc = s[after];
  if (nc !== ' ' && nc !== '\t') return null;
  // count the whitespace after the marker in columns
  let col = after, i = after;
  while (i < s.length && (s[i] === ' ' || s[i] === '\t')) {
    if (s[i] === ' ') col++;
    else col += 4 - (col % 4);
    i++;
  }
  const wsCols = col - after;
  let contentIndent;
  if (i >= s.length) {
    // only whitespace after the marker: empty item
    contentIndent = ind + markerLen + 1;
    return { bullet: c, ordered, delim, start, markerLen, contentIndent, empty: true };
  }
  if (wsCols >= 5) contentIndent = ind + markerLen + 1;
  else contentIndent = col;
  return { bullet: c, ordered, delim, start, markerLen, contentIndent, empty: false };
}
// A line that can interrupt a paragraph as a list start (marked/CommonMark:
// a bullet list can interrupt if its first item is non-empty; an ordered
// list only when it starts with 1 and is non-empty -- except inside a list
// item (top=false), where any start number interrupts).
function listInterrupts(s, ind, top) {
  const ls = listStart(s, ind);
  if (!ls || ls.empty) return false;
  if (ls.ordered && top !== false && ls.start !== 1) return false;
  return true;
}
// Table delimiter row: cells of - : with optional pipes. Returns the
// alignments array (null | 'left' | 'center' | 'right') or null.
function tableDelimiter(s) {
  const cells = splitTableRow(s);
  if (cells === null || cells.length === 0) return null;
  const aligns = [];
  for (let cell of cells) {
    cell = cell.trim();
    if (!/^:?-+:?$/.test(cell)) return null;
    if (cell.startsWith(':') && cell.endsWith(':') && cell.length >= 3) aligns.push('center');
    else if (cell.endsWith(':')) aligns.push('right');
    else if (cell.startsWith(':')) aligns.push('left');
    else aligns.push(null);
  }
  return aligns;
}
// Split a table row on unescaped pipes outside code spans. Returns the cell
// strings (trimmed of one leading/trailing pipe), or null if the row has no
// pipe structure at all (caller decides). Escapes and code spans are kept
// verbatim in the cell text for the inline parser.
function splitTableRow(s) {
  // marked's de(): an unescaped '|' is a separator (even inside a code
  // span), an escaped one stays in the cell; drop a leading/trailing empty
  // cell; trim each cell and replace '\|' with '|'.
  let hasPipe = false;
  const out = [];
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '|') {
      hasPipe = true;
      let l = false, p = i;
      while (--p >= 0 && s[p] === '\\') l = !l;
      if (l) cur += '|';
      else { out.push(cur); cur = ''; }
    } else {
      cur += c;
    }
  }
  out.push(cur);
  if (!hasPipe) return null;
  if (out.length > 0 && out[0].trim() === '') out.shift();
  if (out.length > 0 && out[out.length - 1].trim() === '') out.pop();
  return out.map(x => x.trim().replace(/\\\|/g, '|'));
}

// ---- block parser ------------------------------------------------------
// Lines are objects {s: string, lz: bool} (lz = lazy continuation line:
// it was included in a container without its marker). parseBlocks appends
// nodes to `out`. ctx = {top, nextAfter, endsWithNL}.
//   top: whether the paragraph tokenizer is active (false inside list items:
//        a continuation line with indent >= 4 is code-merged, not raw text).
//   nextAfter: the line object following this lines array in the parent
//        context (for the HTML block trailing-newline rule), or null.
//   endsWithNL: whether the whole input ends with '\n'.
function parseBlocks(lines, start, end, refs, out, ctx) {
  let i = start;
  let pendingBlank = false;
  while (i < end) {
    const L = lines[i];
    const s = L.s;
    if (isBlankLine(s)) {
      if (out.length > 0) pendingBlank = true;
      i++;
      continue;
    }
    // a block after blank lines (with a block before them) means a blank
    // line separates two top-level blocks (used for list looseness)
    if (pendingBlank) { ctx.blankBetween = true; pendingBlank = false; }
    const info = leadingWsInfo(s);
    const ind = info.col;
    const idx = info.idx;
    if (ind >= 4) {
      i = parseIndentedCode(lines, i, end, out);
      continue;
    }
    // fenced code
    const fence = fenceStart(s, idx);
    if (fence) { i = parseFencedCode(lines, i, end, fence, out); continue; }
    // ATX heading
    const atx = atxHeading(s, idx);
    if (atx) { out.push({ t: 'h', level: atx.level, text: atx.text }); i++; continue; }
    // thematic break
    if (isThematicBreak(s, idx)) { out.push({ t: 'hr' }); i++; continue; }
    // HTML block (types 1-7; type 7 cannot interrupt a paragraph, but here
    // we are at block level so all types apply)
    const hb = htmlBlockStart(s, idx);
    if (hb) { i = parseHtmlBlock(lines, i, end, hb, out, ctx); continue; }
    // blockquote
    if (s[idx] === '>') { i = parseBlockquote(lines, i, end, refs, out, ctx); continue; }
    // list
    const ls = listStart(s, idx);
    if (ls) { i = parseList(lines, i, end, refs, out, ctx); continue; }
    // paragraph (handles setext headings, link ref defs, tables)
    i = parseParagraph(lines, i, end, refs, out, ctx);
  }
}

// Indented code: lines with indent >= 4 (or up to 3 spaces + tab), plus
// blank lines between them. Returns the next index.
function parseIndentedCode(lines, i, end, out) {
  const parts = [];
  let j = i;
  const pending = [];
  while (j < end) {
    const s = lines[j].s;
    if (isBlankLine(s)) { pending.push(removeCodeIndent(s)); j++; continue; }
    const info = leadingWsInfo(s);
    if (info.col >= 4) {
      for (let k = 0; k < pending.length; k++) parts.push(pending[k]);
      pending.length = 0;
      parts.push(removeCodeIndent(s));
      j++;
    } else break;
  }
  let text = parts.join('\n');
  if (text.length > 0) text += '\n';
  out.push({ t: 'code', lang: null, text });
  return j;
}

// Fenced code. fence = {ch, n, info, indentChars}. Marked's
// indentCodeCompensation regex is /^(\s+)(?:```)/ — it only matches a
// backtick fence, so a tilde fence never strips leading indent from its
// content lines.
function parseFencedCode(lines, i, end, fence, out) {
  const strip = fence.ch === '`' ? fence.indentChars : 0;
  const parts = [];
  let j = i + 1;
  while (j < end) {
    const s = lines[j].s;
    const info = leadingWsInfo(s);
    if (isFenceEnd(s, info.idx, fence.ch, fence.n)) { j++; break; }
    // strip up to `strip` leading whitespace characters
    let line = s;
    if (strip > 0) {
      let k = 0, removed = 0;
      while (k < line.length && removed < strip && (line[k] === ' ' || line[k] === '\t')) { k++; removed++; }
      line = line.slice(k);
    }
    parts.push(line);
    j++;
  }
  // drop at most one trailing empty line (a whitespace-only line is kept)
  if (parts.length > 0 && parts[parts.length - 1] === '') parts.pop();
  let text = parts.join('\n');
  if (parts.length > 0) text += '\n';
  let lang = null;
  if (fence.info.length > 0) {
    const sp = fence.info.search(/[ \t]/);
    lang = sp === -1 ? fence.info : fence.info.slice(0, sp);
    // the language is unescaped (``` foo\+bar -> language-foo+bar)
    if (lang.indexOf('\\') !== -1) lang = lang.replace(/\\([!"#$%&'()*+,\-./:;<=>?@\[\\\]^_`{|}~])/g, '$1');
  }
  out.push({ t: 'code', lang, text });
  return j;
}

// HTML block. Returns the next index.
function parseHtmlBlock(lines, i, end, hb, out, ctx) {
  const parts = [];
  let j = i;
  if (hb.type >= 6) {
    while (j < end && !isBlankLine(lines[j].s)) { parts.push(lines[j].s); j++; }
  } else {
    while (j < end) {
      const s = lines[j].s;
      parts.push(s);
      j++;
      if (htmlBlockEnd(s, hb)) break;
    }
  }
  // trailing newline: for types 1-5 (which end at a closing line) it is
  // present iff the next line exists and has any characters at all — even
  // just whitespace counts, only a truly empty next line means no trailing
  // newline — or the block reaches the end of the (top-level) input which
  // ends with '\n'. Type 6-7 blocks end at a blank line, so the next line
  // is blank and there is never a trailing newline there. Nested content
  // (a list item or blockquote) is lines joined with '\n' and never ends
  // with one, so no trailing newline there.
  let text = parts.join('\n');
  if (j < end) {
    if (hb.type < 6 && lines[j].s.length > 0) text += '\n';
  } else if (ctx.endsWithNL) {
    text += '\n';
  }
  out.push({ t: 'html', text });
  return j;
}

// Blockquote: collect content lines (stripping '> '), plus lazy paragraph
// continuation lines, then recurse.
function parseBlockquote(lines, i, end, refs, out, ctx) {
  const content = [];
  let j = i;
  let outerNext = null;
  // whether the collected content ends inside an unclosed fenced code
  // block at the top level (a lazy line then ends the quote instead of
  // continuing it)
  let fence = null;
  while (j < end) {
    const L = lines[j];
    const s = L.s;
    const info = leadingWsInfo(s);
    if (info.col <= 3 && s[info.idx] === '>') {
      // Strip the marker: expand the whitespace after '>' with J (base =
      // the column after '>'), then drop the marker and one space char.
      const mcol = info.idx + 1;
      let w = mcol;
      while (w < s.length && (s[w] === ' ' || s[w] === '\t')) w++;
      const expanded = expandWs(s.slice(mcol, w), mcol);
      const rest = s.slice(w);
      const cl = (expanded.length > 0 ? expanded.slice(1) : '') + rest;
      // a '>'-line whose content is whitespace-only but non-empty (e.g.
      // '>  ' -> ' ') is paragraph text, not a blank line (marked's
      // paragraph regex matches it); mark it so parseBlocks/parseParagraph
      // do not treat it as blank
      content.push({ s: cl, lz: false, ws: cl.length > 0 && cl.trim() === '' });
      // track fenced code state at the top level of the content
      const cinfo = leadingWsInfo(cl);
      if (cinfo.col <= 3) {
        if (fence) {
          if (isFenceEnd(cl, cinfo.idx, fence.ch, fence.n)) fence = null;
        } else {
          const fs = fenceStart(cl, cinfo.idx);
          if (fs) fence = fs;
        }
      }
      j++;
      continue;
    }
    if (isBlankLine(s)) {
      // a blank line with no '>' marker ends the quote (CommonMark ex. 229:
      // '> foo\n\n> bar' is two blockquotes); a blank '>'-line is handled
      // by the marker branch above
      break;
    }
    // lazy setext underline (a '=' run, or a '-' run that is not a thematic
    // break): included in the quote with a 4-space indent replacing its
    // leading spaces, so it stays paragraph text (marked's blockquote
    // setext replace)
    if (content.length > 0 && !fence && prevParagraphOpen(content[content.length - 1].s)) {
      const sinfo = leadingWsInfo(s);
      if (sinfo.col <= 3 && isSetextLine(s, sinfo.idx) && !isThematicBreak(s, sinfo.idx)) {
        content.push({ s: '    ' + s.slice(sinfo.idx), lz: false });
        j++;
        continue;
      }
    }
    // lazy continuation: only if the last content line leaves a paragraph
    // open, and this line would be paragraph continuation text
    if (content.length > 0 && !fence && prevParagraphOpen(content[content.length - 1].s) &&
      isParagraphContinuation(s, content[content.length - 1].s)) {
      content.push({ s, lz: true });
      j++;
      continue;
    }
    break;
  }
  outerNext = j < end ? lines[j] : ctx.nextAfter;
  const children = [];
  parseBlocks(content, 0, content.length, refs, children,
    { top: true, nextAfter: outerNext, endsWithNL: false });
  out.push({ t: 'quote', children });
  return j;
}

// Is `line` a line that would be paragraph continuation text (not a new
// block that can interrupt a paragraph)? `prev` is the previous content
// line, used for the setext/table checks. A line indented >= 4 is also
// paragraph continuation: it is lexed as indented code and merged into the
// paragraph with 4 columns removed (marked's blockquote grouping), so the
// block-start checks only apply at indent <= 3.
function isParagraphContinuation(line, prev) {
  if (isBlankLine(line)) return false;
  const info = leadingWsInfo(line);
  if (info.col > 3) return true;
  const idx = info.idx;
  if (fenceStart(line, idx)) return false;
  if (atxHeading(line, idx)) return false;
  if (isThematicBreak(line, idx)) return false;
  if (isSetextLine(line, idx)) return false;
  const hb = htmlBlockStart(line, idx);
  if (hb && hb.type !== 7) return false;
  if (line[idx] === '>') return false;
  if (listInterrupts(line, idx)) return false;
  // a table delimiter row after a single-line paragraph would start a table
  if (tableDelimiter(line) !== null) return false;
  return true;
}

// Does the content line `prev` leave a paragraph open (so that a following
// lazy line can continue it)? A plain text line does; a list item whose
// first block is a paragraph does; block starts do not. A lazy line can
// continue a paragraph nested inside a blockquote or list item, so the
// check recurses through those.
function prevParagraphOpen(prev) {
  if (isBlankLine(prev)) return false;
  const info = leadingWsInfo(prev);
  if (info.col >= 4) return false;
  const idx = info.idx;
  if (fenceStart(prev, idx)) return false;
  if (atxHeading(prev, idx)) return false;
  if (isThematicBreak(prev, idx)) return false;
  if (isSetextLine(prev, idx)) return false;
  const hb = htmlBlockStart(prev, idx);
  if (hb && hb.type !== 7) return false;
  if (prev[idx] === '>') {
    // a blockquote: strip the marker and check the rest
    const mcol = idx + 1;
    let w = mcol;
    while (w < prev.length && (prev[w] === ' ' || prev[w] === '\t')) w++;
    const expanded = expandWs(prev.slice(mcol, w), mcol);
    const rest = prev.slice(w);
    const cl = (expanded.length > 0 ? expanded.slice(1) : '') + rest;
    if (cl.trim() === '') return false;
    return prevParagraphOpen(cl);
  }
  if (tableDelimiter(prev) !== null) return false;
  const ls = listStart(prev, idx);
  if (ls) {
    if (ls.empty) return false;
    // the item's first block is a paragraph unless its content starts a block;
    // recurse into the content (it may itself be a blockquote or list)
    const cIdx = ls.contentIndent;
    if (cIdx >= prev.length) return false;
    const cInfo = leadingWsInfo(prev.slice(cIdx));
    if (cInfo.col >= 4) return false;
    return prevParagraphOpen(prev.slice(cIdx + cInfo.idx));
  }
  return true;
}

// ---- lists -------------------------------------------------------------
// Does `line` start a block (fence/heading/html/blockquote/bullet/hr) at an
// indent of at most `maxIndent` *spaces* (marked's ^ {0,R} regexes count
// spaces, not tabs)? `kind` selects which checks run.
function lineStartsBlock(line, maxIndent, kinds) {
  let k = 0;
  while (k < line.length && line[k] === ' ' && k < maxIndent) k++;
  if (k >= line.length) return false;
  // if there are at least maxIndent leading spaces, the line belongs to
  // the item (it is indented to the content indent), so it does not start
  // a new block
  let spaces = 0;
  while (spaces < line.length && line[spaces] === ' ') spaces++;
  if (spaces >= maxIndent) return false;
  const idx = spaces;
  if (kinds.fence && fenceStart(line, idx)) return true;
  if (kinds.heading && atxHeading(line, idx)) return true;
  if (kinds.html) { const hb = htmlBlockStart(line, idx); if (hb && hb.type !== 7) return true; }
  if (kinds.quote && line[idx] === '>') return true;
  if (kinds.bullet && listStart(line, idx)) return true;
  if (kinds.hr && isThematicBreak(line, idx)) return true;
  return false;
}
// Expand the leading whitespace run of `s` with J (base `base`) and return
// the resulting string.
function expandLeadingWs(s, base) {
  let i = 0;
  while (i < s.length && (s[i] === ' ' || s[i] === '\t')) i++;
  if (i === 0) return s;
  return expandWs(s.slice(0, i), base) + s.slice(i);
}
function parseList(lines, i, end, refs, out, ctx) {
  const first = lines[i].s;
  const firstInfo = leadingWsInfo(first);
  const ls0 = listStart(first, firstInfo.idx);
  const ordered = ls0.ordered;
  const bullet = ls0.bullet;
  const delim = ls0.delim;
  const startNum = ls0.start;
  const items = [];
  let loose = false;
  let j = i;
  while (j < end) {
    // skip blank lines between items (they make the list loose); only
    // consume them when the next line is a valid item of this list, so a
    // blank line before a different block is left for the parent
    let blanksBetween = 0;
    let jj = j;
    while (jj < end && isBlankLine(lines[jj].s)) { blanksBetween++; jj++; }
    if (jj >= end) break;
    const s = lines[jj].s;
    const info = leadingWsInfo(s);
    if (info.col > 3) break;
    // a thematic break ends the list (it wins over a list marker)
    if (isThematicBreak(s, info.idx)) break;
    const ls = listStart(s, info.idx);
    if (!ls) break;
    if (ordered) {
      if (!ls.ordered || ls.delim !== delim) break;
    } else {
      if (ls.ordered || ls.bullet !== bullet) break;
    }
    j = jj;
    if (blanksBetween > 0 && items.length > 0) loose = true;
    // ---- one item ----
    const b = info.idx + ls.markerLen; // column after the marker
    const rest = s.slice(info.idx + ls.markerLen); // ws + content after marker
    const m0 = expandLeadingWs(rest, b);
    const y0 = m0.trim() === '';
    let R, d;
    if (y0) { R = b + 1; d = ''; }
    else {
      let r0 = m0.search(/[^ ]/);
      if (r0 > 4) r0 = 1;
      d = m0.slice(r0);
      R = r0 + b;
    }
    let y = y0;
    let m = m0;
    let k = j + 1;
    // collect the item's subsequent lines
    const itemLines = [d];
    while (k < end) {
      const f = lines[k].s;
      const Z0 = expandLeadingWs(f, 0);
      const z0 = Z0.search(/[^ ]/);
      // a line indented >= 4 (but below the content indent) is indented
      // code inside the item; include it as-is (parseParagraph with
      // top=false will code-merge it into the paragraph)
      if (z0 >= 4 && z0 < R && f.trim() !== '') {
        itemLines.push(f);
        y = false;
        m = Z0;
        k++;
        continue;
      }
      if (lineStartsBlock(f, R, { fence: true, heading: true, html: true, quote: true, bullet: true, hr: true })) break;
      const Z = Z0;
      const zIdx = z0;
      if (zIdx >= R || !f.trim()) {
        // an empty item ends at a blank line (the blank line is not part
        // of the item)
        if (!f.trim() && itemLines.length === 1 && itemLines[0] === '') break;
        // blank line: if the next non-blank line starts a block that ends
        // this item (and is not a sibling item of this list), or is a lazy
        // line below the content indent (which cannot continue the item
        // after a blank line), stop here and leave the blank lines for the
        // parent, so they count as a separator between blocks at the
        // parent's level
        if (!f.trim()) {
          let k2 = k + 1;
          while (k2 < end && isBlankLine(lines[k2].s)) k2++;
          if (k2 >= end) break;
          const f2 = lines[k2].s;
          const i2 = leadingWsInfo(f2);
          const ls2 = i2.col <= 3 ? listStart(f2, i2.idx) : null;
          const sibling = ls2 && (ordered ? (ls2.ordered && ls2.delim === delim) : (!ls2.ordered && ls2.bullet === bullet));
          if (sibling) {
            // a blank line before a sibling item belongs to this item (the
            // trailing-blank check below will mark the list loose)
          } else if (i2.col >= R) {
            // the next line is part of this item; the blank line is inside it
          } else {
            break;
          }
        }
        itemLines.push(Z.slice(R));
        y = !f.trim();
        m = Z.slice(R);
        k++;
        continue;
      }
      // lazy continuation line
      if (y || m.replace(/\t/g, '    ').search(/[^ ]/) >= 4 ||
        lineStartsBlock(m, R, { fence: true, heading: true, html: true, hr: true })) break;
      let qe;
      if (/^ {0,3}(?:=+|-+) *$/.test(f) && isSetextLine(f, leadingWsInfo(f).idx)) {
        // a lazy setext underline is not a heading: indent it by 4 so it
        // stays paragraph text (marked's qe trick)
        qe = '    ' + Z.replace(/^ {0,3}/, '');
      } else {
        qe = f;
      }
      itemLines.push(qe);
      y = !f.trim();
      m = Z.slice(R);
      k++;
    }
    // trim trailing blank lines from the item content (keeping at least the
    // first line: an empty item's '' is its content, not a blank separator);
    // a blank line between this item and the next item makes the list loose
    let trailingBlanks = 0;
    while (itemLines.length > 1 && itemLines[itemLines.length - 1].trim() === '') { itemLines.pop(); trailingBlanks++; }
    if (trailingBlanks > 0 && k < end) {
      const ns = lines[k].s;
      const ninfo = leadingWsInfo(ns);
      if (ninfo.col <= 3) {
        const nls = listStart(ns, ninfo.idx);
        if (nls && (ordered ? (nls.ordered && nls.delim === delim) : (!nls.ordered && nls.bullet === bullet))) {
          loose = true;
        }
      }
    }
    const contentLines = itemLines.map(x => ({ s: x, lz: false }));
    const nextAfter = k < end ? lines[k] : ctx.nextAfter;
    const children = [];
    const childCtx = { top: false, nextAfter, endsWithNL: false, blankBetween: false };
    parseBlocks(contentLines, 0, contentLines.length, refs, children, childCtx);
    // a blank line between two top-level blocks inside the item makes the
    // list loose (a blank line inside a nested block does not)
    if (childCtx.blankBetween) loose = true;
    // task list item?
    let task = false, checked = false;
    if (children.length > 0 && children[0].t === 'p') {
      const txt = children[0].text;
      const tm = /^\[[ xX]\][ \t]+\S/.exec(txt);
      if (tm) {
        task = true;
        checked = txt[1] !== ' ';
        children[0].text = txt.replace(/^\[[ xX]\][ \t]+/, '');
      }
    }
    items.push({ children, task, checked });
    j = k;
  }
  out.push({ t: 'list', ordered, start: startNum, loose, items });
  return j;
}

// ---- paragraphs and tables ---------------------------------------------
function parseParagraph(lines, i, end, refs, out, ctx) {
  const textLines = [];
  let j = i;
  let heading = null;
  let table = null;
  while (j < end) {
    const L = lines[j];
    const s = L.s;
    if (j > i) {
      if (isBlankLine(s) && !L.ws) break;
      const info = leadingWsInfo(s);
      const ind = info.col, idx = info.idx;
      if (L.lz) {
        // lazy line: always paragraph text; with indent >= 4 it is
        // code-merged (removeCodeIndent) as in marked's blockquote groups
        if (ind >= 4) textLines.push(removeCodeIndent(s));
        else textLines.push(s);
        j++;
        continue;
      }
      if (ind <= 3) {
        // setext heading?
        if (textLines.length > 0 && isSetextLine(s, idx)) {
          heading = { t: 'h', level: s[idx] === '=' ? 1 : 2, text: textLines.join('\n').trim() };
          j++;
          break;
        }
        // table?
        if (textLines.length === 1) {
          const aligns = tableDelimiter(s);
          if (aligns !== null) {
            const headerCells = splitTableRow(textLines[0]);
            if (headerCells !== null && headerCells.length === aligns.length &&
              (textLines[0].indexOf('|') !== -1 || s.indexOf('|') !== -1)) {
              table = parseTable(lines, j, end, textLines[0], aligns, refs, ctx);
              j = table.next;
              break;
            }
          }
        }
        // link reference definition (only before any text line)
        if (textLines.length === 0) {
          const def = tryParseDef(lines, j, end);
          if (def) {
            if (!refs.has(def.label)) refs.set(def.label, { dest: def.dest, title: def.title });
            j = def.end;
            continue;
          }
        }
        // interruption by another block?
        if (fenceStart(s, idx) || atxHeading(s, idx) || isThematicBreak(s, idx)) break;
        const hb = htmlBlockStart(s, idx);
        if (hb && hb.type !== 7) break;
        if (s[idx] === '>') break;
        if (listInterrupts(s, idx, ctx.top)) break;
      }
      // plain continuation line (code-merged when top=false and indent>=4)
      if (!ctx.top && ind >= 4) textLines.push(removeCodeIndent(s));
      else textLines.push(s);
      j++;
      continue;
    }
    // first line: link reference definition(s) only
    const def = tryParseDef(lines, j, end);
    if (def) {
      if (!refs.has(def.label)) refs.set(def.label, { dest: def.dest, title: def.title });
      j = def.end;
      continue;
    }
    textLines.push(s);
    j++;
  }
  if (heading) { out.push(heading); return j; }
  if (table) { out.push(table.node); return j; }
  if (textLines.length === 0) return j;
  out.push({ t: 'p', text: textLines.join('\n') });
  return j;
}

// Parse a table starting at the delimiter row (lines[j]). Returns
// {node, next}.
function parseTable(lines, j, end, headerLine, aligns, refs, ctx) {
  const headerCells = splitTableRow(headerLine);
  const rows = [];
  let k = j + 1;
  while (k < end) {
    const s = lines[k].s;
    // marked's table body ends only at a line of spaces (or empty) — the
    // body-row lookahead is (?! *\n|...), so a line containing a tab is a
    // body row (an empty row), not a blank line ending the table
    if (/^ *$/.test(s)) break;
    const info = leadingWsInfo(s);
    if (info.col <= 3) {
      const idx = info.idx;
      if (fenceStart(s, idx) || atxHeading(s, idx) || isThematicBreak(s, idx)) break;
      const hb = htmlBlockStart(s, idx);
      if (hb && hb.type !== 7) break;
      if (s[idx] === '>') break;
      if (listStart(s, idx)) break;
    }
    let cells = splitTableRow(s);
    if (cells === null) cells = [s.trim().replace(/\\\|/g, '|')];
    while (cells.length < headerCells.length) cells.push('');
    if (cells.length > headerCells.length) cells.length = headerCells.length;
    rows.push(cells);
    k++;
  }
  return { node: { t: 'table', aligns, header: headerCells, rows }, next: k };
}

// ---- inline parsing ------------------------------------------------------
// Node kinds (k):
//  t: text (raw source with numeric character references decoded; rendered
//     with the noEncode escape)
//  c: code span content (raw; rendered with the encode escape)
//  h: raw HTML tag (rendered as-is; contributes its source to image alt text)
//  u: autolink (s = rendered <a...>, txt = display text)
//  o: link/image opener (img, pos = source index of '[', active)
//  a: link opener (href, title already cleaned; bad = lone-surrogate href)
//  /a: link closer (bad mirrors the opener)
//  i: image (href, title already cleaned; alt = raw plain text)
//  d: delimiter run (c = '*' or '_', n = remaining length, open, close)
//  e: em/strong opener (n = 1 em, 2 strong)
//  /e: em/strong closer
//  b: hard break

function isAlnum(code) { return (code >= 48 && code <= 57) || (code >= 65 && code <= 90) || (code >= 97 && code <= 122); }
function isNarrowLocal(code) { return isAlnum(code) || code === 46 || code === 95 || code === 43 || code === 45; }
// email local-part charset for the broad lookahead:
// [a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]
function isBroadLocal(code) {
  return isAlnum(code) || code === 46 || code === 33 || code === 35 || code === 36 || code === 37 ||
    code === 38 || code === 39 || code === 42 || code === 43 || code === 47 || code === 61 ||
    code === 63 || code === 94 || code === 95 || code === 96 || code === 123 || code === 124 ||
    code === 125 || code === 126 || code === 45;
}

// Code point ending just before index i (handles surrogate pairs); -1 at
// the start of the source.
function cpBefore(src, i) {
  if (i <= 0) return -1;
  const c = src.charCodeAt(i - 1);
  if (c >= 0xDC00 && c <= 0xDFFF && i >= 2) {
    const h = src.charCodeAt(i - 2);
    if (h >= 0xD800 && h <= 0xDBFF) return (h - 0xD800) * 0x400 + (c - 0xDC00) + 0x10000;
  }
  return c;
}
// Flanking for a delimiter run src[start..end): line boundaries count as
// Unicode whitespace (not punctuation), per CommonMark.
function flanking(src, start, end) {
  const bCp = cpBefore(src, start);
  const aCp = end >= src.length ? -1 : src.codePointAt(end);
  const bWs = bCp === -1 || isWsCp(bCp);
  const bPu = bCp !== -1 && isPunctCp(bCp);
  const aWs = aCp === -1 || isWsCp(aCp);
  const aPu = aCp !== -1 && isPunctCp(aCp);
  return {
    left: !aWs && (!aPu || bWs || bPu),
    right: !bWs && (!bPu || aWs || aPu),
    bPu, aPu,
    // group-6 run (marked's emStrongRDelim regex): a non-whitespace,
    // non-punctuation character on both sides of the run
    g6: !bWs && !bPu && !aWs && !aPu,
    // group-5/6 run (odd-match applies in marked's emStrong m-accounting):
    // group 6, or preceded by punctuation and followed by punctuation
    g56: (!bWs && !bPu && !aWs && !aPu) || (bPu && aPu),
    // group-3/4 run (opener-like in marked's emStrong m-accounting):
    // preceded by punctuation/space and followed by a word char (group 3),
    // or preceded by whitespace and followed by punctuation (group 4)
    g34: ((bPu || bWs) && !aWs && !aPu) || (bWs && aPu)
  };
}

// Parse a numeric character reference at s[i] ('&'). Returns {ch, end} or
// null. A value of 38 decodes to the literal string '&amp;' (marked's
// entity pass does this so the following escape pass does not treat it as
// an entity start); 0, surrogates and > 0x10FFFF decode to U+FFFD.
function parseNumericRef(s, i) {
  if (s[i] !== '&' || s[i + 1] !== '#') return null;
  let j = i + 2, hex = false;
  if (s[j] === 'x' || s[j] === 'X') { hex = true; j++; }
  const start = j;
  const maxDigits = hex ? 6 : 7;
  while (j < s.length && j - start < maxDigits) {
    const c = s.charCodeAt(j);
    if (hex ? (c >= 48 && c <= 57) || (c >= 65 && c <= 70) || (c >= 97 && c <= 102) : (c >= 48 && c <= 57)) j++;
    else break;
  }
  if (j === start || j >= s.length || s[j] !== ';') return null;
  const cp = parseInt(s.slice(start, j), hex ? 16 : 10);
  if (cp === 0 || cp > 0x10ffff || (cp >= 0xd800 && cp <= 0xdfff)) return { ch: '\uFFFD', end: j + 1 };
  if (cp === 38) return { ch: '&amp;', end: j + 1 };
  return { ch: String.fromCodePoint(cp), end: j + 1 };
}

// Backpedal-trim a bare (www/scheme) URL: drop trailing punctuation, an
// unmatched trailing '(', and a trailing '&' that starts an entity
// reference ending at the end of the string. (marked's _backpedal.)
const URL_TAIL_PUNCT = '?!.,:;*_\'"~)';
function backpedal(url) {
  let i = 0;
  const n = url.length;
  while (i < n) {
    const c = url[i];
    if (c === '(') {
      const close = url.indexOf(')', i + 1);
      if (close === -1) break;
      i = close + 1;
      continue;
    }
    if (c === '&') {
      if (/^[a-zA-Z0-9]+;$/.test(url.slice(i + 1))) break;
      i++;
      continue;
    }
    if (URL_TAIL_PUNCT.indexOf(c) !== -1) {
      let j = i;
      while (j < n && URL_TAIL_PUNCT.indexOf(url[j]) !== -1) j++;
      if (j < n) { i = j; continue; }
      break;
    }
    i++;
  }
  return url.slice(0, i);
}

// Match a bare email address at src[i] (narrow local part). Returns {end}
// or null.
function matchEmail(src, i) {
  const n = src.length;
  let j = i;
  while (j < n && isNarrowLocal(src.charCodeAt(j))) j++;
  if (j === i || j >= n || src[j] !== '@') return null;
  let k = j + 1;
  while (k < n) {
    const c = src.charCodeAt(k);
    if (isAlnum(c) || c === 45 || c === 95) k++;
    else break;
  }
  if (k === j + 1) return null;
  let labels = 0;
  // whether a '_' emphasis opener precedes this email in the source: only
  // then can a trailing '_' run be an emphasis delimiter (which marked
  // consumes before matching the email inside the emphasis content)
  let hasUndOpener = false;
  {
    let b = i - 1;
    const floor = Math.max(0, i - 1000);
    while (b >= floor) {
      if (src[b] === '_') {
        let a = b;
        while (a >= floor && src[a] === '_') a--;
        const fl = flanking(src, a + 1, b + 1);
        if (fl.left) { hasUndOpener = true; break; }
        b = a;
      } else b--;
    }
  }
  while (k < n && src[k] === '.') {
    let m = k + 1;
    while (m < n) {
      const c = src.charCodeAt(m);
      if (isAlnum(c) || c === 45 || c === 95) m++;
      else break;
    }
    // no label after the dot, or a label not ending in an alnum: the
    // domain ends before this dot (a trailing '.' is not part of it).
    // Exception: a label ending in '_' may end at an emphasis delimiter
    // (e.g. an email inside __...__): backtrack over the trailing '_'
    // run and take the label up to its last alnum, but only when a '_'
    // opener precedes the email.
    if (m === k + 1) break;
    if (!isAlnum(src.charCodeAt(m - 1))) {
      if (hasUndOpener && src.charCodeAt(m - 1) === 95) {
        let e = m;
        while (e > k + 1 && src.charCodeAt(e - 1) === 95) e--;
        if (e === k + 1 || !isAlnum(src.charCodeAt(e - 1))) break;
        labels++;
        k = e;
        break;
      }
      break;
    }
    labels++;
    k = m;
  }
  if (labels === 0) return null;
  if (k < n) {
    const c = src.charCodeAt(k);
    if (isAlnum(c) || c === 45) return null;
    // a trailing '_' that starts an emphasis delimiter run (it can close)
    // does not block the email, but only when a '_' opener precedes it:
    // marked tokenizes the emphasis content separately, where the
    // delimiter is already consumed
    if (c === 95) {
      if (!hasUndOpener) return null;
      let m = k;
      while (m < n && src[m] === '_') m++;
      const fl = flanking(src, k, m);
      const canClose = fl.right && (!fl.left || fl.aPu);
      if (!canClose) return null;
      return { end: k };
    }
  }
  return { end: k };
}

// Try to match a bare extended autolink at src[i]. `j` is the index just
// after the 'www.' or '://' prefix. Returns {href, text, end} or null.
function tryExtUrl(src, i, j, kind) {
  const n = src.length;
  let k = j;
  while (k < n) {
    const c = src.charCodeAt(k);
    if (isAlnum(c) || c === 45) k++;
    else break;
  }
  if (k === j) return null;
  let end = k;
  while (end < n) {
    const c = src.charCodeAt(end);
    if (c === 32 || c === 9 || c === 10 || c === 11 || c === 12 || c === 13 || c === 60) break;
    if (c >= 128 && isWsCp(src.codePointAt(end))) break;
    end++;
  }
  const url = src.slice(i, end);
  // marked applies the backpedal until the result stops changing
  let prev = url, trimmed = backpedal(url);
  while (trimmed !== prev) { prev = trimmed; trimmed = backpedal(trimmed); }
  if (trimmed.length === 0) return null;
  if (kind === 'www') return { href: 'http://' + trimmed, text: trimmed, end: i + trimmed.length };
  return { href: trimmed, text: trimmed, end: i + trimmed.length };
}

// Check a domain for a <...> autolink email: labels of 1-63 chars starting
// and ending with an alphanumeric, middle chars alphanumerics or '-',
// at least two labels.
function checkAutolinkDomain(dom) {
  if (dom.length === 0) return false;
  const labels = dom.split('.');
  if (labels.length < 2) return false;
  for (const lab of labels) {
    if (lab.length === 0 || lab.length > 63) return false;
    if (!isAlnum(lab.charCodeAt(0)) || !isAlnum(lab.charCodeAt(lab.length - 1))) return false;
    for (let k = 1; k < lab.length - 1; k++) {
      const c = lab.charCodeAt(k);
      if (!isAlnum(c) && c !== 45) return false;
    }
  }
  return true;
}

// Try a <...> autolink at src[i] ('<'). Returns {href, text, end} or null.
function tryAutolink(src, i) {
  const gt = src.indexOf('>', i + 1);
  if (gt === -1) return null;
  const inner = src.slice(i + 1, gt);
  for (let k = 0; k < inner.length; k++) {
    const c = inner.charCodeAt(k);
    if (c <= 32 || c === 127 || c === 60) return null;
  }
  const colon = inner.indexOf(':');
  if (colon >= 2 && colon <= 32) {
    const c0 = inner.charCodeAt(0);
    let ok = (c0 >= 65 && c0 <= 90) || (c0 >= 97 && c0 <= 122);
    for (let k = 1; ok && k < colon; k++) {
      const c = inner.charCodeAt(k);
      if (!isAlnum(c) && c !== 43 && c !== 46 && c !== 45) ok = false;
    }
    if (ok) return { href: inner, text: inner, end: gt + 1 };
  }
  const at = inner.indexOf('@');
  if (at > 0) {
    let ok = true;
    for (let k = 0; k < at; k++) { if (!isBroadLocal(inner.charCodeAt(k))) { ok = false; break; } }
    if (ok && checkAutolinkDomain(inner.slice(at + 1))) {
      return { href: 'mailto:' + inner, text: inner, end: gt + 1 };
    }
  }
  return null;
}

// Scan an inline HTML tag starting at src[i] ('<'). Returns the index just
// after the tag, or -1. Handles comments, processing instructions,
// declarations, CDATA sections, and open/closing tags (with quote-aware
// scanning for '>').
function scanTagToGt(src, i) {
  let j = i + 1, quote = 0;
  while (j < src.length) {
    const ch = src[j];
    if (quote) { if (ch === quote) quote = 0; j++; continue; }
    if (ch === '"' || ch === "'") { quote = ch; j++; continue; }
    if (ch === '>') return j + 1;
    j++;
  }
  return -1;
}
// Parse an open HTML tag starting at src[i] === '<' (with a letter after).
// Returns the index just after the '>' or -1. Mirrors marked's inline tag
// regex: <name (attribute)* \s* /?> where an attribute is
// \s+name(\s*=\s*"..."|\s*=\s*'...'|\s*=\s*unquoted)?
function tagEndAt(src, i) {
  let p = i + 1;
  if (p >= src.length) return -1;
  const c0 = src.charCodeAt(p);
  if (!((c0 >= 65 && c0 <= 90) || (c0 >= 97 && c0 <= 122))) return -1;
  p++;
  while (p < src.length) {
    const c = src.charCodeAt(p);
    if (isAlnum(c) || c === 45) p++;
    else break;
  }
  const isWs = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r';
  while (true) {
    let q = p;
    while (q < src.length && isWs(src[q])) q++;
    if (q >= src.length) return -1;
    if (src[q] === '>') return q + 1;
    if (src[q] === '/' && src[q + 1] === '>') return q + 2;
    if (q === p) return -1;
    // attribute name: [a-zA-Z:_][\w.:-]*
    const nc = src.charCodeAt(q);
    if (!((nc >= 65 && nc <= 90) || (nc >= 97 && nc <= 122) || nc === 95 || nc === 58)) return -1;
    q++;
    while (q < src.length) {
      const c = src.charCodeAt(q);
      if (isAlnum(c) || c === 95 || c === 46 || c === 58 || c === 45) q++;
      else break;
    }
    let r = q;
    while (r < src.length && isWs(src[r])) r++;
    if (src[r] === '=') {
      r++;
      while (r < src.length && isWs(src[r])) r++;
      if (src[r] === '"') {
        r++;
        while (r < src.length && src[r] !== '"') r++;
        if (r >= src.length) return -1;
        r++;
      } else if (src[r] === "'") {
        r++;
        while (r < src.length && src[r] !== "'") r++;
        if (r >= src.length) return -1;
        r++;
      } else {
        const start = r;
        while (r < src.length) {
          const c = src[r];
          if (isWs(c) || c === '"' || c === "'" || c === '=' || c === '<' || c === '>' || c === '`') break;
          r++;
        }
        if (r === start) return -1;
      }
      p = r;
    } else {
      // no value: do not consume the following whitespace here, so the
      // next iteration's whitespace check sees it (an attribute must be
      // preceded by whitespace)
      p = q;
    }
  }
}

function scanHtmlTag(src, i) {
  const c1 = src[i + 1];
  if (c1 === undefined) return -1;
  if (c1 === '!') {
    if (src.startsWith('<!--', i)) {
      // '<!-->' and '<!--->' are complete (empty) comments
      if (src[i + 4] === '>') return i + 5;
      if (src[i + 4] === '-' && src[i + 5] === '>') return i + 6;
      const end = src.indexOf('-->', i + 4);
      return end === -1 ? -1 : end + 3;
    }
    if (src.startsWith('<![CDATA[', i)) {
      const end = src.indexOf(']]>', i + 9);
      return end === -1 ? -1 : end + 3;
    }
    if (i + 2 < src.length) {
      const c2 = src.charCodeAt(i + 2);
      if ((c2 >= 65 && c2 <= 90) || (c2 >= 97 && c2 <= 122)) {
        // <!letters requires whitespace after the letters
        let j = i + 2;
        while (j < src.length) {
          const c = src.charCodeAt(j);
          if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) j++;
          else break;
        }
        if (j < src.length && (src[j] === ' ' || src[j] === '\t' || src[j] === '\n' || src[j] === '\r')) {
          return scanTagToGt(src, i);
        }
      }
    }
    return -1;
  }
  if (c1 === '?') {
    const end = src.indexOf('?>', i + 2);
    return end === -1 ? -1 : end + 2;
  }
  if (c1 === '/') {
    if (i + 2 < src.length) {
      const c2 = src.charCodeAt(i + 2);
      if ((c2 >= 65 && c2 <= 90) || (c2 >= 97 && c2 <= 122)) {
        // closing tag: </name\s*>
        let j = i + 2;
        while (j < src.length) {
          const c = src.charCodeAt(j);
          if (isAlnum(c) || c === 45) j++;
          else break;
        }
        while (j < src.length && (src[j] === ' ' || src[j] === '\t' || src[j] === '\n' || src[j] === '\r')) j++;
        return src[j] === '>' ? j + 1 : -1;
      }
    }
    return -1;
  }
  const c = src.charCodeAt(i + 1);
  if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) return tagEndAt(src, i);
  return -1;
}

// Try to match a strikethrough delimiter at src[i] ('~'). Returns
// {end, content} or null. Marked matches `~` runs with a delimiter stack,
// so an inner `~~...~~` pair balances before the outer closer: track a
// depth of inner openers of the same length and only return a closer when
// the depth is back to zero.
function tryDel(src, i) {
  if (src[i + 1] === '~' && src[i + 2] === '~') return null;
  const n = src.length;
  for (let nn = src[i + 1] === '~' ? 2 : 1; nn >= 1; nn--) {
    const openEnd = i + nn;
    if (openEnd >= n) continue;
    const c0 = src[openEnd];
    if (c0 === '~' || isUnicodeWsCh(c0)) continue;
    let j = openEnd;
    let lastValid = false;
    let depth = 0;
    while (j < n) {
      const ch = src[j];
      if (ch === '\\' && j + 1 < n) { j += 2; lastValid = true; continue; }
      if (ch === '~') {
        let k = j;
        while (k < n && src[k] === '~') k++;
        if (k - j === nn) {
          const fl = flanking(src, j, k);
          if (fl.right && lastValid) {
            if (depth === 0) return { end: k, content: src.slice(openEnd, j) };
            depth--;
          } else if (fl.left) {
            depth++;
          }
        }
        j = k;
        lastValid = false;
        continue;
      }
      lastValid = !isUnicodeWsCh(ch);
      j++;
    }
  }
  return null;
}

// Try an inline link tail '(dest "title")' at src[pos] ('('). Returns
// {href, title, end} or null.
function tryInlineTail(src, pos) {
  const n = src.length;
  let j = pos + 1;
  while (j < n && (src[j] === ' ' || src[j] === '\t' || src[j] === '\n')) j++;
  if (j >= n) return null;
  let dest, k;
  if (src[j] === '<') {
    k = j + 1;
    while (k < n && src[k] !== '>' && src[k] !== '\n') {
      if (src[k] === '\\' && k + 1 < n) k += 2;
      else if (src[k] === '<') return null;
      else k++;
    }
    if (k >= n || src[k] !== '>') return null;
    dest = src.slice(j + 1, k);
    k++;
  } else {
    k = j;
    let depth = 0;
    while (k < n) {
      const ch = src[k];
      if (ch === '\\' && k + 1 < n) { k += 2; continue; }
      if (ch === ' ' || ch === '\t' || ch === '\n' || src.charCodeAt(k) < 32) break;
      if (ch === '(') { depth++; k++; continue; }
      if (ch === ')') { if (depth === 0) break; depth--; k++; continue; }
      k++;
    }
    dest = src.slice(j, k);
  }
  let m = k;
  while (m < n && (src[m] === ' ' || src[m] === '\t' || src[m] === '\n')) m++;
  let title = null;
  if (m < n && (src[m] === '"' || src[m] === "'" || src[m] === '(')) {
    const q = src[m], closeQ = q === '(' ? ')' : q;
    let t = m + 1, ok = false;
    while (t < n) {
      if (src[t] === '\\' && t + 1 < n) { t += 2; continue; }
      if (src[t] === closeQ) { ok = true; break; }
      t++;
    }
    if (!ok) return null;
    title = src.slice(m + 1, t);
    m = t + 1;
    while (m < n && (src[m] === ' ' || src[m] === '\t' || src[m] === '\n')) m++;
  }
  if (m >= n || src[m] !== ')') return null;
  return { href: dest, title, end: m + 1, inline: true };
}

// Whether a link text matches marked's link-text pattern (the `re` used
// in its link/reflink regexes): a sequence of nested brackets, escapes,
// code spans, backticks before ']', and ordinary characters. The code-span
// atom is `+(?!`)[^`]*?`+(?!`) — it takes the FIRST backtick run after the
// opener as the closer, whatever its length, so a multi-backtick span
// containing a shorter backtick run (e.g. `` `` a ` b `` ``) leaves the
// rest of the text unmatchable and the whole link fails to form.
function linkTextOk(t) {
  let i = 0;
  const n = t.length;
  while (i < n) {
    const c = t[i];
    if (c === '[') {
      let j = i + 1, depth = 1;
      while (j < n) {
        if (t[j] === '\\' && j + 1 < n) { j += 2; continue; }
        if (t[j] === '[') depth++;
        else if (t[j] === ']') { depth--; if (depth === 0) break; }
        j++;
      }
      if (j >= n) return false;
      i = j + 1;
      continue;
    }
    if (c === '\\' && i + 1 < n) { i += 2; continue; }
    if (c === '`') {
      let m = i;
      while (m < n && t[m] === '`') m++;
      // backticks at the very end of the text match ``+(?=]) (they sit
      // right before the closing ']') — but that atom needs TWO or more
      // backticks; a single backtick at the end can only match the code
      // span atom, whose closer lies past the ']', so the link fails
      if (m === n) return m - i >= 2;
      let k = m;
      while (k < n && t[k] !== '`') k++;
      if (k >= n) return false;
      let e = k;
      while (e < n && t[e] === '`') e++;
      i = e;
      continue;
    }
    if (c === ']') return false;
    i++;
  }
  return true;
}

// Parse a link tail after ']' at src[pos]. `linkTextRaw` is the raw source
// between the opener '[' and this ']'. Returns {href, title, end} (href and
// title are the raw destination/title strings) or null. If the inline form
// fails, the reference forms are tried instead.
function parseLinkTail(src, pos, refs, linkTextRaw) {
  const n = src.length;
  if (!linkTextOk(linkTextRaw)) return null;
  if (src[pos] === '(') {
    const inline = tryInlineTail(src, pos);
    if (inline) return inline;
    // the inline form failed: fall through to the reference forms
  }
  // reference link: [label], [] (collapsed) or shortcut
  let labelRaw = null, end;
  if (src[pos] === '[') {
    let k = pos + 1;
    while (k < n) {
      if (src[k] === '\\' && k + 1 < n) { k += 2; continue; }
      if (src[k] === ']' || src[k] === '[') break;
      k++;
    }
    if (k >= n || src[k] !== ']') return null;
    labelRaw = src.slice(pos + 1, k);
    end = k + 1;
  } else {
    end = pos;
  }
  const label = normalizeLabel(labelRaw === null || labelRaw === '' ? linkTextRaw : labelRaw);
  if (label.length === 0) return null;
  const ref = refs.get(label);
  if (!ref) return null;
  return { href: ref.dest, title: ref.title, end };
}

// Percent-encode a URL without unescaping backslashes (for autolinks).
// Returns null on a lone surrogate.
function encodeUrl(raw) {
  try { return encodeURI(raw).replace(/%25/g, '%'); } catch (e) { return null; }
}

// Render an autolink's <a ...>...</a> (href and text both use the encode
// escape). Returns the HTML string, or null when the href has a lone
// surrogate.
function autolinkHtml(hrefRaw, textRaw) {
  const href = encodeUrl(hrefRaw);
  if (href === null) return null;
  return '<a href="' + escText(href) + '">' + escText(textRaw) + '</a>';
}

// Scan inline source into nodes. `refs` maps normalised labels to
// {dest, title}.
function scanInline(src, refs) {
  const nodes = [];
  const openers = [];
  let textBuf = '';
  let textStart = 0;
  let boundary = true;
  const n = src.length;
  let i = 0;
  // Suppression intervals [start,end) from dangling backticks in a formed
  // link's text (marked's emStrong mask): a backtick run in link text with
  // no matching closer inside the text pairs with the next same-length run
  // after the link, and emphasis delimiters between them stay literal.
  // Filled in by the ']' handler when a link forms; checked by the
  // emphasis/strikethrough handlers below.
  const suppress = [];
  // Does the innermost open link's text (so far) already contain a link
  // node? If so that link cannot form (nested links are blocked), so a
  // bare autolink here may form — it cannot break a link that will never
  // form. Otherwise a bare autolink is suppressed while an opener is
  // active, so it cannot swallow the ']' that closes a link that will
  // form.
  const openerHasLink = () => {
    if (openers.length === 0) return false;
    const op = openers[openers.length - 1];
    const opIdx = nodes.indexOf(op);
    for (let q = opIdx + 1; q < nodes.length; q++) {
      if (nodes[q].k === 'a') return true;
    }
    return false;
  };
  const pushRaw = (upto) => { if (upto > textStart) textBuf += src.slice(textStart, upto); };
  const flushText = () => {
    pushRaw(i);
    if (textBuf) { nodes.push({ k: 't', s: textBuf }); textBuf = ''; }
    textStart = i;
  };
  while (i < n) {
    const code = src.charCodeAt(i);
    // backslash escape / hard break
    if (code === 92) {
      const d = src[i + 1];
      if (d === '\n') {
        flushText();
        nodes.push({ k: 'b' });
        i += 2;
        while (i < n && (src[i] === ' ' || src[i] === '\t')) i++;
        textStart = i;
        boundary = true;
        continue;
      }
      if (d !== undefined && isAsciiPunct(d.charCodeAt(0))) {
        // the escaped character is its own text token: it must not merge
        // with following text (so \&ouml; renders &amp;ouml;, not &ouml;)
        flushText();
        nodes.push({ k: 't', s: d });
        i += 2;
        textStart = i;
        boundary = true;
        continue;
      }
      i++;
      boundary = false;
      continue;
    }
    // code span
    if (code === 96) {
      let m = i;
      while (m < n && src[m] === '`') m++;
      const run = m - i;
      // A code span inside link text cannot reach past the ']' that closes
      // the innermost open link — but only when that link will actually
      // form (its text matches marked's link-text pattern, so marked
      // tokenizes the link first and scans its text separately). When the
      // link text does not match (e.g. a lone backtick at its end), marked
      // does not form the link and the code span may span past the ']'.
      let limit = n;
      if (openers.length > 0) {
        let depth = 1, q = i;
        while (q < n) {
          if (src[q] === '\\' && q + 1 < n) { q += 2; continue; }
          if (src[q] === '[') depth++;
          else if (src[q] === ']') { depth--; if (depth === 0) { limit = q; break; } }
          q++;
        }
        if (limit < n) {
          const op = openers[openers.length - 1];
          if (!linkTextOk(src.slice(op.pos + (op.img ? 2 : 1), limit))) limit = n;
        }
      }
      let j = m, close = -1;
      while (j < limit) {
        if (src[j] === '`') {
          let k = j;
          while (k < n && src[k] === '`') k++;
          if (k - j === run) { close = j; break; }
          j = k;
        } else j++;
      }
      if (close === -1) { i = m; boundary = false; continue; }
      let content = src.slice(m, close);
      if (content.indexOf('\n') !== -1) content = content.replace(/\n/g, ' ');
      if (content.length >= 2 && content[0] === ' ' && content[content.length - 1] === ' ') {
        let allSpace = true;
        for (let q = 1; q < content.length - 1; q++) { if (content[q] !== ' ') { allSpace = false; break; } }
        if (!allSpace) content = content.slice(1, -1);
      }
      flushText();
      nodes.push({ k: 'c', s: content });
      i = close + run;
      textStart = i;
      boundary = true;
      continue;
    }
    // numeric character reference (named entities stay raw)
    if (code === 38) {
      const nr = parseNumericRef(src, i);
      if (nr) {
        pushRaw(i);
        textBuf += nr.ch;
        i = nr.end;
        textStart = i;
        boundary = false;
        continue;
      }
      i++;
      boundary = false;
      continue;
    }
    // <...> autolink / inline HTML tag
    if (code === 60) {
      const al = tryAutolink(src, i);
      if (al) {
        flushText();
        const html = autolinkHtml(al.href, al.text);
        nodes.push(html === null ? { k: 'h', s: escText(al.text) } : { k: 'u', s: html, txt: al.text });
        i = al.end;
        textStart = i;
        boundary = true;
        continue;
      }
      const tagEnd = scanHtmlTag(src, i);
      if (tagEnd !== -1) {
        flushText();
        // marked's tag tokenizer updates inLink: <a␣ opens, </a> closes
        const t1 = src.charCodeAt(i + 1);
        if (!inLink && (t1 === 97 || t1 === 65) && src.charCodeAt(i + 2) === 32) inLink = true;
        else if (inLink && t1 === 47 && (src.charCodeAt(i + 2) === 97 || src.charCodeAt(i + 2) === 65) && src.charCodeAt(i + 3) === 62) inLink = false;
        nodes.push({ k: 'h', s: src.slice(i, tagEnd) });
        i = tagEnd;
        textStart = i;
        boundary = true;
        continue;
      }
      i++;
      boundary = false;
      continue;
    }
    // link / image opener
    if (code === 91 || (code === 33 && src[i + 1] === '[')) {
      flushText();
      const img = code === 33;
      const op = { k: 'o', img, pos: img ? i : i, active: true };
      nodes.push(op);
      openers.push(op);
      i += img ? 2 : 1;
      textStart = i;
      boundary = true;
      continue;
    }
    // ']' : try to form a link
    if (code === 93) {
      let formed = false;
      // the link text must be in the node list before the link can form
      flushText();
      if (openers.length > 0) {
        const op = openers[openers.length - 1];
        const linkTextRaw = src.slice(op.pos + (op.img ? 2 : 1), i);
        const tail = parseLinkTail(src, i + 1, refs, linkTextRaw);
        if (tail) {
          const opIdx = nodes.indexOf(op);
          // a link's text may not contain a link node (images may)
          let hasLink = false;
          if (!op.img) {
            for (let q = opIdx + 1; q < nodes.length; q++) {
              if (nodes[q].k === 'a') { hasLink = true; break; }
            }
          }
          if (!hasLink) {
            const href = cleanHref(tail.href);
            const title = tail.title === null ? null : cleanTitle(tail.title);
            if (op.img) {
              const alt = altText(nodes, opIdx + 1, nodes.length);
              if (href === null) {
                nodes.splice(opIdx, nodes.length - opIdx, { k: 't', s: alt });
              } else {
                nodes.splice(opIdx, nodes.length - opIdx, { k: 'i', href, title, alt });
              }
            } else {
              // bare extended autolinks do not form inside link text
              // (marked's inLink): turn them back into plain text
              for (let q = opIdx + 1; q < nodes.length; q++) {
                if (nodes[q].k === 'u' && nodes[q].bare) nodes[q] = { k: 't', s: nodes[q].txt };
              }
              const bad = href === null;
              nodes[opIdx] = { k: 'a', href: bad ? '' : href, title, bad };
              nodes.push({ k: '/a', bad });
            }
            // deactivate every opener inside the link text
            for (let q = openers.length - 1; q >= 0; q--) {
              if (openers[q] === op) { openers.splice(q, 1); break; }
              openers[q].active = false;
              openers.splice(q, 1);
            }
            i = tail.end;
            textStart = i;
            boundary = true;
            formed = true;
            // dangling backticks in this link's text: a backtick run with
            // no matching closer inside the text pairs with the next
            // same-length run after the link (marked's emStrong mask), and
            // emphasis delimiters between them stay literal. Only for
            // INLINE links: a reference link is masked whole by marked's
            // reflink masking when refs exist, so its backticks never pair
            // with a later run (doc-35: [run ``response`][tool-91] must not
            // suppress the *fast* in the following link).
            if (tail.inline) {
              const textStartPos = op.pos + (op.img ? 2 : 1);
              const open = new Map();
              let p = 0;
              while (p < linkTextRaw.length) {
                if (linkTextRaw[p] !== '`') { p++; continue; }
                let q = p;
                while (q < linkTextRaw.length && linkTextRaw[q] === '`') q++;
                const run = q - p;
                const st = open.get(run);
                if (st && st.length > 0) {
                  // this run closes a code span opened by the matching
                  // run; any runs pushed after that opener are inside the
                  // code span's content, not dangling, so drop them
                  const openerPos = st.pop();
                  for (const [r2, poss2] of open) {
                    for (let k = poss2.length - 1; k >= 0; k--) {
                      if (poss2[k] > openerPos) poss2.splice(k, 1);
                    }
                  }
                } else {
                  if (!open.has(run)) open.set(run, []);
                  open.get(run).push(p);
                }
                p = q;
              }
              for (const [run, poss] of open) {
                for (const off of poss) {
                  const dPos = textStartPos + off;
                  // next backtick run of the SAME length after the link
                  // (marked's code-span pattern allows backticks of other
                  // lengths inside the content, so skip those runs)
                  let r = tail.end, nextPos = -1;
                  while (r < n) {
                    if (src[r] === '`') {
                      let e2 = r;
                      while (e2 < n && src[e2] === '`') e2++;
                      if (e2 - r === run) { nextPos = r; break; }
                      r = e2;
                    } else r++;
                  }
                  if (nextPos >= 0) suppress.push([dPos, nextPos + run]);
                }
              }
            }
          }
        }
        if (!formed) {
          // this opener cannot form a link
          op.active = false;
          openers.pop();
          // marked's emStrong mask treats a `[...](...)` that looks like a
          // link (its blockSkip pattern, which allows spaces in the
          // destination and code spans in the label) as masked even when
          // the real link does not form, so emphasis delimiters inside its
          // text stay literal (e.g. `[foo *bar*](not a link)`). If this
          // ']' is immediately followed by '(' with a closing ')' later
          // and the label has no unescaped '[' outside code spans, turn
          // the delimiter nodes inside the link text into plain text.
          if (src[i + 1] === '(') {
            let depth = 0, j = i + 1, closed = false;
            while (j < n) {
              if (src[j] === '\\' && j + 1 < n) { j += 2; continue; }
              if (src[j] === '(') depth++;
              else if (src[j] === ')') { depth--; if (depth === 0) { closed = true; break; } }
              j++;
            }
            if (closed) {
              let hasBracket = false, k = 0;
              const label = linkTextRaw;
              while (k < label.length) {
                if (label[k] === '\\' && k + 1 < label.length) { k += 2; continue; }
                if (label[k] === '`') {
                  let m2 = k;
                  while (m2 < label.length && label[m2] === '`') m2++;
                  const run = m2 - k;
                  let c2 = -1, q = m2;
                  while (q < label.length) {
                    if (label[q] === '`') {
                      let e2 = q;
                      while (e2 < label.length && label[e2] === '`') e2++;
                      if (e2 - q === run) { c2 = q; break; }
                      q = e2;
                    } else q++;
                  }
                  if (c2 >= 0) { k = c2 + run; continue; }
                  k = m2;
                  continue;
                }
                if (label[k] === '[') { hasBracket = true; break; }
                k++;
              }
              if (!hasBracket) {
                const opIdx = nodes.indexOf(op);
                for (let q = opIdx + 1; q < nodes.length; q++) {
                  if (nodes[q].k === 'd') nodes[q] = { k: 't', s: nodes[q].c.repeat(nodes[q].len) };
                }
              }
            }
          }
        }
      }
      if (!formed) { i++; boundary = false; }
      continue;
    }
    // emphasis delimiter
    if (code === 42 || code === 95) {
      const ch = code === 42 ? '*' : '_';
      let m = i;
      while (m < n && src[m] === ch) m++;
      // inside a dangling-backtick suppression interval: literal text
      let sup = false;
      for (let s2 = 0; s2 < suppress.length; s2++) {
        if (i >= suppress[s2][0] && i < suppress[s2][1]) { sup = true; break; }
      }
      if (sup) { i = m; boundary = false; continue; }
      const fl = flanking(src, i, m);
      let open, close;
      if (ch === '*') { open = fl.left; close = fl.right; }
      else {
        open = fl.left && (!fl.right || fl.bPu);
        close = fl.right && (!fl.left || fl.aPu);
      }
      flushText();
      nodes.push({ k: 'd', c: ch, n: m - i, len: m - i, open, close, g6: fl.g6, g34: fl.g34, g56: fl.g56 });
      i = m;
      textStart = i;
      boundary = true;
      continue;
    }
    // strikethrough
    if (code === 126) {
      // inside a dangling-backtick suppression interval: literal text
      let sup = false;
      for (let s2 = 0; s2 < suppress.length; s2++) {
        if (i >= suppress[s2][0] && i < suppress[s2][1]) { sup = true; break; }
      }
      if (sup) { i++; boundary = false; continue; }
      const del = tryDel(src, i);
      if (del) {
        flushText();
        const inner = scanInline(del.content, refs);
        processEmphasis(inner);
        // delimiters left over inside the del are literal text here: they
        // must not match delimiters outside the del when the outer list
        // is processed
        for (const nd of inner) {
          if (nd.k === 'o') nd.active = false;
          else if (nd.k === 'd' && nd.n > 0) { nd.k = 't'; nd.s = nd.c.repeat(nd.n); }
        }
        nodes.push({ k: 'h', s: '<del>' });
        for (const nd of inner) nodes.push(nd);
        nodes.push({ k: 'h', s: '</del>' });
        i = del.end;
        textStart = i;
        boundary = true;
        continue;
      }
      i++;
      boundary = false;
      continue;
    }
    // newline: hard break (2+ spaces/tabs before it) or soft break
    if (code === 10) {
      let k = i - 1, spaces = 0;
      while (k >= 0 && (src[k] === ' ' || src[k] === '\t')) { spaces++; k--; }
      if (spaces >= 2) {
        pushRaw(i - spaces);
        if (textBuf) { nodes.push({ k: 't', s: textBuf }); textBuf = ''; }
        nodes.push({ k: 'b' });
        i++;
        while (i < n && (src[i] === ' ' || src[i] === '\t')) i++;
        textStart = i;
        boundary = true;
        continue;
      }
      i++;
      boundary = false;
      continue;
    }
    // extended autolinks: scheme, www., mailto:/xmpp:, email. A bare URL
    // inside an active link/image opener may still form when its matched
    // extent contains no ']' (so it cannot swallow the ']' that closes
    // the link text); the ']' handler converts bare autolinks inside a
    // formed link's text back to plain text, so forming tentatively is
    // safe. When the extent does contain ']' the autolink is suppressed
    // while an opener is active, to protect a link that may form.
    if ((code === 104 || code === 72 || code === 102 || code === 70) && !inLink) {
      // http://, https://, ftp:// (case-insensitive)
      let schemeLen = 0;
      if (src.slice(i, i + 7).toLowerCase() === 'http://') schemeLen = 7;
      else if (src.slice(i, i + 8).toLowerCase() === 'https://') schemeLen = 8;
      else if (src.slice(i, i + 6).toLowerCase() === 'ftp://') schemeLen = 6;
      if (schemeLen > 0) {
        const u = tryExtUrl(src, i, i + schemeLen, 'scheme');
        if (u && (openers.length === 0 || openerHasLink() || u.text.indexOf(']') === -1)) {
          flushText();
          const html = autolinkHtml(u.href, u.text);
          nodes.push(html === null ? { k: 'h', s: escText(u.text) } : { k: 'u', s: html, txt: u.text, bare: true });
          i = u.end;
          textStart = i;
          boundary = true;
          continue;
        }
      }
    }
    if (code === 119 && src[i + 1] === 'w' && src[i + 2] === 'w' && src[i + 3] === '.' && !inLink) {
      if (boundary || src[i - 1] === ' ' || src[i - 1] === '\t' || src[i - 1] === '\n' || src[i - 1] === '(') {
        const u = tryExtUrl(src, i, i + 4, 'www');
        if (u && (openers.length === 0 || openerHasLink() || u.text.indexOf(']') === -1)) {
          flushText();
          const html = autolinkHtml(u.href, u.text);
          nodes.push(html === null ? { k: 'h', s: escText(u.text) } : { k: 'u', s: html, txt: u.text, bare: true });
          i = u.end;
          textStart = i;
          boundary = true;
          continue;
        }
      }
    }
    if ((code === 109 || code === 120) && !inLink) {
      // mailto: / xmpp: (lowercase only), not after an alphanumeric
      let preLen = 0, mailto = false;
      if (src.slice(i, i + 7) === 'mailto:') { preLen = 7; mailto = true; }
      else if (src.slice(i, i + 5) === 'xmpp:') { preLen = 5; mailto = false; }
      if (preLen > 0 && (boundary || !isAlnum(src.charCodeAt(i - 1)))) {
        const em = matchEmail(src, i + preLen);
        if (em) {
          let end = em.end;
          if (!mailto) {
            // xmpp may have a /resource suffix
            if (src[end] === '/') {
              let r = end + 1;
              while (r < n) {
                const c = src.charCodeAt(r);
                if (isAlnum(c) || c === 64 || c === 46) r++;
                else break;
              }
              if (r > end + 1) end = r;
            }
          }
          const text = src.slice(i, end);
          if (openers.length === 0 || openerHasLink() || text.indexOf(']') === -1) {
            flushText();
            const html = autolinkHtml(text, text);
            nodes.push(html === null ? { k: 'h', s: escText(text) } : { k: 'u', s: html, txt: text, bare: true });
            i = end;
            textStart = i;
            boundary = true;
            continue;
          }
        }
      }
    }
    // bare email (only at the start of a maximal narrow-local run)
    if (isNarrowLocal(code) && (i === 0 || !isNarrowLocal(src.charCodeAt(i - 1))) && !inLink) {
      const em = matchEmail(src, i);
      if (em) {
        const text = src.slice(i, em.end);
        if (openers.length === 0 || openerHasLink() || text.indexOf(']') === -1) {
          flushText();
          const html = autolinkHtml('mailto:' + text, text);
          nodes.push(html === null ? { k: 'h', s: escText(text) } : { k: 'u', s: html, txt: text, bare: true });
          i = em.end;
          textStart = i;
          boundary = true;
          continue;
        }
      }
    }
    // plain character
    i++;
    boundary = false;
  }
  flushText();
  return nodes;
}

// Process emphasis/strong delimiters in a node list (CommonMark delimiter
// stack). Delimiter nodes left over afterwards render as literal text.
function processEmphasis(nodes) {
  const delims = [];
  for (const nd of nodes) if (nd.k === 'd') delims.push(nd);
  if (delims.length === 0) return;
  // link depth of each delimiter (delimiters may only match within the same
  // link depth; a '*' outside a link cannot match one inside its text)
  const depthOf = new Map();
  let ld = 0;
  for (const nd of nodes) {
    if (nd.k === 'a') ld++;
    else if (nd.k === '/a') ld--;
    else if (nd.k === 'd') depthOf.set(nd, ld);
  }
  // Emphasis already formed in this list (opener, closer, length used):
  // a nested strong/em whose opener is group-3/4 and whose closer is
  // group-5/6 can block an outer opener from closing (marked's emStrong
  // m-accounting — the group-3 opener adds its length to m, the group-5/6
  // closer is skipped by the odd-match rule, so m never reaches 0).
  const formed = [];
  // Two passes, mirroring marked's preference for same-length matches:
  // first match runs of length >= 2 (strong), then runs of length 1 (em,
  // including leftovers from a run that gave up 2 delimiters to a strong).
  // This keeps a '**' pair from being split by an outer '*' (and vice versa).
  for (let pass = 0; pass < 1; pass++) {
    const minN = 1;
    const stack = [];
    for (const D of delims) {
      if (D.n < minN) continue;
      if (D.close && D.n > 0) {
        while (D.n > 0 && D.close) {
          let oi = -1;
          const di = delims.indexOf(D);
          // two-tier opener search: prefer a same-length opener (a clean
          // em/strong) over a nearer different-length one
          for (let tier = 0; tier < 2 && oi === -1; tier++) {
            for (let s = stack.length - 1; s >= 0; s--) {
              const O = stack[s];
              if (O.c !== D.c || !O.open || O.n === 0) continue;
              if (O.n < minN) continue;
              if (depthOf.get(O) !== depthOf.get(D)) continue;
              if (tier === 0 && O.n !== D.n) continue;
              if (tier === 1 && O.n === D.n) continue;
              // odd-match rule: skip this opener
              if (O.open && O.close && D.open && D.close &&
                (O.n + D.n) % 3 === 0 && O.n % 3 !== 0) continue;
              // nested-strong block (m-accounting): a formed emphasis
              // between O and D whose opener is group-3/4 and whose closer
              // is group-5/6, with the odd-match rule skipping that closer,
              // leaves m > 0, so D cannot close O. Only when the strong's
              // opener/closer are the ONLY same-char runs between O and D
              // (otherwise other runs change the accounting).
              {
                const oi2 = delims.indexOf(O), di2 = delims.indexOf(D);
                let blocked = false;
                for (const f of formed) {
                  const fo = delims.indexOf(f.o), fc = delims.indexOf(f.c);
                  if (fo <= oi2 || fc >= di2 || fo < 0 || fc < 0) continue;
                  if (f.n !== 2 || !f.o.g34 || !f.c.g56) continue;
                  if (O.n % 3 !== 0 && (O.n + f.n) % 3 === 0) {
                    let sameChar = 0;
                    for (let q = oi2 + 1; q < di2; q++) {
                      const X = delims[q];
                      if (X.c === O.c && X.len > 0 && depthOf.get(X) === depthOf.get(O)) sameChar++;
                    }
                    if (sameChar === 2) { blocked = true; break; }
                  }
                }
                if (blocked) continue;
              }
              // same-length preference: if this opener has a later closer of
              // at least its length (so it can form a clean em/strong with a
              // same-length partner), do not let a closer of a different
              // length steal it. A later closer only counts if it is a pure
              // closer (it cannot open, so it will not be used as an opener
              // for a following closer) and it is not already claimed by the
              // pure openers after this closer and before it (their lengths
              // sum to at least the closer's length, so they will consume it).
              if (O.n !== D.n) {
                let hasLater = false;
                // O is enclosed by another opener O2 on the stack (same
                // char, before O) that D can match: if D does not match O
                // it will match O2, trapping O inside, so no later closer
                // can ever be O's partner — do not block this match
                let enclosed = false;
                const oiO = delims.indexOf(O);
                for (let s2 = 0; s2 < stack.length; s2++) {
                  const O2 = stack[s2];
                  if (O2 === O || O2.c !== D.c || !O2.open || O2.n === 0) continue;
                  if (depthOf.get(O2) !== depthOf.get(O)) continue;
                  if (delims.indexOf(O2) < oiO) { enclosed = true; break; }
                }
                if (!enclosed) {
                for (let q = di + 1; q < delims.length; q++) {
                  const C2 = delims[q];
                  if (C2.c !== O.c || !C2.close || C2.open || C2.n < O.n || C2.n === 0 ||
                    depthOf.get(C2) !== depthOf.get(O)) continue;
                  let openSum = 0;
                  for (let r = di + 1; r < q; r++) {
                    const O2 = delims[r];
                    if (O2.c === C2.c && O2.open && !O2.close && O2.n > 0 &&
                      depthOf.get(O2) === depthOf.get(C2)) openSum += O2.n;
                  }
                  if (openSum < C2.n) { hasLater = true; break; }
                }
                }
                if (hasLater) continue;
              }
              oi = s;
              break;
            }
          }
          if (oi === -1) break;
          const O = stack[oi];
          const use = (O.n >= 2 && D.n >= 2) ? 2 : 1;
          const oIdx = nodes.indexOf(O);
          nodes.splice(oIdx + 1, 0, { k: 'e', n: use });
          const cm = { k: '/e', n: use };
          nodes.splice(nodes.indexOf(D), 0, cm);
          formed.push({ o: O, c: D, n: use, cm });
          O.n -= use;
          D.n -= use;
          if (O.n === 0) stack.splice(oi, 1);
          // delimiters still on the stack after the opener are trapped inside
          // this emphasis (any nested emphasis they could form would already
          // have formed, since its closer comes before this closer); they can
          // never match a delimiter outside, so drop them
          stack.splice(oi + (O.n === 0 ? 0 : 1));
          if (D.n === 0) {
            const si = stack.indexOf(D);
            if (si !== -1) stack.splice(si, 1);
            break;
          }
        }
      }
      if (D.open && D.n > 0 && D.n >= minN) stack.push(D);
    }
  }
  // A closer run that was partially consumed leaves its leftover asterisks
  // as literal text. When the emphasis it closed contains a formed inner
  // emphasis, those asterisks are the FIRST ones in the run (the closer
  // used the LAST ones), so they belong inside, before the closing
  // marker. When the emphasis contains only plain text, the leftover
  // stays outside (cm-443/446). Distinguish by whether another formed
  // match sits strictly between this match's opener and closer.
  {
    const ownClose = new Map();
    for (const f of formed) ownClose.set(f.c, f);
    for (let i = 1; i < nodes.length; i++) {
      const nd = nodes[i];
      if (nd.k !== 'd' || nd.n <= 0) continue;
      const f = ownClose.get(nd);
      if (!f || f.cm !== nodes[i - 1] || f.n !== 2) continue;
      const oi2 = delims.indexOf(f.o), di2 = delims.indexOf(f.c);
      let hasInner = false;
      for (const g of formed) {
        if (g === f) continue;
        const go = delims.indexOf(g.o), gc = delims.indexOf(g.c);
        if (go > oi2 && gc < di2 && go >= 0 && gc >= 0) { hasInner = true; break; }
      }
      if (hasInner) {
        nodes.splice(i, 1);
        nodes.splice(i - 1, 0, nd);
      }
    }
  }
}

// Plain text of the nodes in nodes[from..to) (for image alt text): code
// contributes its content, emphasis markers nothing, raw HTML tags their
// source, autolinks their display text, hard breaks nothing, openers
// '[' / '!['.
// Image alt text: the plain text of the link-text nodes with emphasis
// resolved first (so *bar* contributes 'bar', not '*bar*'). The nodes are
// about to be discarded by the image splice, so resolving a copy is safe.
function altText(nodes, from, to) {
  const slice = nodes.slice(from, to);
  processEmphasis(slice);
  return plainText(slice, 0, slice.length);
}

function plainText(nodes, from, to) {
  let out = '';
  for (let q = from; q < to; q++) {
    const nd = nodes[q];
    switch (nd.k) {
      case 't': case 'c': case 'h': out += nd.s; break;
      case 'u': out += nd.txt; break;
      case 'o': out += nd.img ? '![' : '['; break;
      case 'd': if (nd.n > 0) out += nd.c.repeat(nd.n); break;
      case 'i': out += nd.alt; break;
      default: break;
    }
  }
  return out;
}

function renderNodes(nodes) {
  let out = '';
  for (const nd of nodes) {
    switch (nd.k) {
      case 't': out += escAttr(nd.s); break;
      case 'c': out += '<code>' + escText(nd.s) + '</code>'; break;
      case 'h': case 'u': out += nd.s; break;
      case 'a':
        if (!nd.bad) {
          out += '<a href="' + nd.href + '"';
          if (nd.title !== null) out += ' title="' + nd.title + '"';
          out += '>';
        }
        break;
      case '/a': if (!nd.bad) out += '</a>'; break;
      case 'i':
        out += '<img src="' + nd.href + '" alt="' + escAttr(nd.alt) + '"';
        if (nd.title !== null) out += ' title="' + nd.title + '"';
        out += '>';
        break;
      case 'd': if (nd.n > 0) out += nd.c.repeat(nd.n); break;
      case 'e': out += nd.n === 2 ? '<strong>' : '<em>'; break;
      case '/e': out += nd.n === 2 ? '</strong>' : '</em>'; break;
      case 'b': out += '<br>'; break;
      case 'o': out += nd.img ? '![' : '['; break;
    }
  }
  return out;
}

function renderInline(src, refs) {
  const nodes = scanInline(src, refs);
  processEmphasis(nodes);
  return renderNodes(nodes);
}

// ---- block rendering -----------------------------------------------------
function renderChildren(children, refs, loose, checkbox) {
  let out = '';
  let first = true;
  for (const ch of children) {
    if (ch.t === 'p' && !loose) {
      if (first && checkbox !== null) out += checkbox;
      out += renderInline(ch.text, refs);
    } else if (ch.t === 'p' && loose && first && checkbox !== null) {
      out += '<p>' + checkbox + renderInline(ch.text, refs) + '</p>\n';
    } else {
      out += renderBlock(ch, refs);
    }
    first = false;
  }
  return out;
}

function renderBlock(nd, refs) {
  switch (nd.t) {
    case 'h': return '<h' + nd.level + '>' + renderInline(nd.text, refs) + '</h' + nd.level + '>\n';
    case 'hr': return '<hr>\n';
    case 'p': return '<p>' + renderInline(nd.text, refs) + '</p>\n';
    case 'code':
      return '<pre><code' + (nd.lang !== null ? ' class="language-' + escAttr(nd.lang) + '"' : '') +
        '>' + escText(nd.text) + '</code></pre>\n';
    case 'html': return nd.text;
    case 'quote': return '<blockquote>\n' + renderBlocks(nd.children, refs) + '</blockquote>\n';
    case 'list': {
      const tag = nd.ordered ? 'ol' : 'ul';
      let out = '<' + tag + (nd.ordered && nd.start !== 1 ? ' start="' + nd.start + '"' : '') + '>\n';
      for (const item of nd.items) {
        const checkbox = item.task
          ? (item.checked ? '<input checked="" disabled="" type="checkbox"> ' : '<input disabled="" type="checkbox"> ')
          : null;
        out += '<li>' + renderChildren(item.children, refs, nd.loose, checkbox) + '</li>\n';
      }
      return out + '</' + tag + '>\n';
    }
    case 'table': {
      let out = '<table>\n<thead>\n<tr>\n';
      for (let c = 0; c < nd.header.length; c++) {
        const a = nd.aligns[c];
        out += '<th' + (a ? ' align="' + a + '"' : '') + '>' + renderInline(nd.header[c], refs) + '</th>\n';
      }
      out += '</tr>\n</thead>\n';
      if (nd.rows.length === 0) return out + '</table>\n';
      out += '<tbody>';
      for (const row of nd.rows) {
        out += '<tr>\n';
        for (let c = 0; c < row.length; c++) {
          const a = nd.aligns[c];
          out += '<td' + (a ? ' align="' + a + '"' : '') + '>' + renderInline(row[c], refs) + '</td>\n';
        }
        out += '</tr>\n';
      }
      return out + '</tbody></table>\n';
    }
    default: return '';
  }
}

function renderBlocks(nodes, refs) {
  let out = '';
  for (const nd of nodes) out += renderBlock(nd, refs);
  return out;
}

// ---- entry point ---------------------------------------------------------
export function parse(markdown) {
  inLink = false;
  const src = markdown.replace(/\r\n?/g, '\n');
  const lines = src.split('\n');
  // a trailing newline does not add a line (it is the line terminator)
  if (src.endsWith('\n')) lines.pop();
  const lineObjs = lines.map(s => ({ s, lz: false }));
  const refs = new Map();
  const nodes = [];
  parseBlocks(lineObjs, 0, lineObjs.length, refs, nodes,
    { top: true, nextAfter: null, endsWithNL: src.endsWith('\n') });
  return renderBlocks(nodes, refs);
}
