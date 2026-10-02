// The Kala Chakra's content. Years are numbers (negative = BCE). Where the
// tradition's dating differs from the scholarly one, both are given and
// neither is presented as the only truth. `library` entries are search
// queries into the user's own books.

export const YUGAS = [
  {
    id: 'satya', name: 'Satya Yuga', sa: 'सत्ययुग', years: 1_728_000, share: 4,
    summary: 'The age of truth, when dharma stands on all four legs. Tradition remembers it as a time without want or deceit, the age of the first teachers and of Matsya, Kurma, Varaha and Narasimha among the avataras.',
    library: ['सत्ययुग', 'satya yuga', 'krita yuga'],
  },
  {
    id: 'treta', name: 'Treta Yuga', sa: 'त्रेतायुग', years: 1_296_000, share: 3,
    summary: 'Dharma on three legs. The age of Vamana, Parashurama and of Rama, whose life the Ramayana tells. Sacrifice (yajna) becomes the central path.',
    library: ['त्रेता', 'treta yuga', 'राम'],
  },
  {
    id: 'dvapara', name: 'Dvapara Yuga', sa: 'द्वापरयुग', years: 864_000, share: 2,
    summary: 'Dharma on two legs. The age of Krishna and the Mahabharata, which ends with the great war at Kurukshetra. Veda Vyasa divides the one Veda into four.',
    library: ['द्वापर', 'dvapara', 'कृष्ण', 'व्यास'],
  },
  {
    id: 'kali', name: 'Kali Yuga', sa: 'कलियुग', years: 432_000, share: 1,
    summary: 'The present age, which tradition dates from 3102 BCE, when Krishna left the world. Dharma stands on one leg; the recommended path is bhakti and the name of God. All of recorded history falls within its first five thousand years.',
    library: ['कलियुग', 'kali yuga', 'कलि'],
  },
];

export const ERAS = [
  {
    id: 'sindhu', name: 'Sindhu–Sarasvati cities', sa: 'सिन्धु-सरस्वती सभ्यता', start: -3300, end: -1300, weight: 1,
    dating: { scholarly: 'c. 3300–1300 BCE, mature phase c. 2600–1900 BCE', traditional: 'Within the early Kali Yuga; the Sarasvati of the Rig Veda flowed here' },
    summary: 'Planned brick cities at Harappa, Mohenjo-daro, Dholavira and Rakhigarhi, with drains, granaries and a script still unread. Seals show figures in yogic posture, the pipal tree and the bull, motifs that continue into later Hindu life.',
    library: ['harappa', 'indus', 'sarasvati', 'सरस्वती'],
  },
  {
    id: 'vedic', name: 'Vedic age', sa: 'वैदिक काल', start: -1500, end: -600, weight: 1.3,
    dating: { scholarly: 'Rig Veda composed c. 1500–1200 BCE; later Vedas and Brahmanas to c. 600 BCE', traditional: 'The Vedas are apauruṣeya, not of human making, heard by the rishis; arranged by Veda Vyasa at the close of Dvapara Yuga' },
    summary: 'The hymns of the Rig Veda to Agni, Indra, Varuna and Soma; the Yajur, Sama and Atharva Vedas; the Brahmanas on the meaning of sacrifice. The shruti, the heard revelation, on which everything later stands.',
    library: ['ऋग्वेद', 'rig veda', 'अग्नि', 'यजुर्वेद', 'सामवेद', 'अथर्ववेद'],
  },
  {
    id: 'upanishadic', name: 'Age of the Upanishads', sa: 'उपनिषद् काल', start: -800, end: -300, weight: 1.1,
    dating: { scholarly: 'Principal Upanishads c. 800–300 BCE', traditional: 'The Upanishads are the Vedanta, the end of the Veda, as eternal as the hymns' },
    summary: 'In the forest schools the questions turn inward: what is Brahman, what is Atman, what survives death? Yajnavalkya, Uddalaka Aruni, Nachiketa. Alongside, the shramana movements of the Buddha and Mahavira, and Panini’s grammar of Sanskrit.',
    library: ['उपनिषद्', 'upanishad', 'ब्रह्म', 'आत्मन्', 'याज्ञवल्क्य'],
  },
  {
    id: 'epic', name: 'Age of the Epics and Dharma', sa: 'इतिहास-धर्मशास्त्र काल', start: -400, end: 400, weight: 1.1,
    dating: { scholarly: 'Ramayana and Mahabharata reach their present form c. 400 BCE–400 CE; Manusmriti c. 200 BCE–200 CE', traditional: 'Rama’s life in Treta Yuga; the Mahabharata war at the end of Dvapara Yuga, c. 3100 BCE' },
    summary: 'The Itihasas, Valmiki’s Ramayana and Vyasa’s Mahabharata, with the Bhagavad Gita at its heart. The Dharmasutras and Manusmriti set out the duties of life. The six darshanas, Samkhya, Yoga, Nyaya, Vaisheshika, Mimamsa and Vedanta, take written form, with Patanjali’s Yoga Sutras.',
    library: ['रामायण', 'महाभारत', 'गीता', 'bhagavad gita', 'मनुस्मृति', 'योगसूत्र'],
  },
  {
    id: 'mauryan', name: 'Mauryan and Shunga age', sa: 'मौर्य-शुङ्ग काल', start: -322, end: -100, weight: 0.7,
    dating: { scholarly: 'Maurya dynasty 322–185 BCE; Ashoka reigns c. 268–232 BCE' },
    summary: 'Chandragupta Maurya, counselled by Chanakya, whose Arthashastra treats statecraft. Ashoka’s edicts carved in stone across the subcontinent. Under the Shungas, Sanskrit learning and the Bhagavata devotion to Vasudeva-Krishna flourish.',
    library: ['अर्थशास्त्र', 'arthashastra', 'chanakya', 'ashoka', 'अशोक'],
  },
  {
    id: 'classical', name: 'Classical age', sa: 'गुप्त काल', start: 320, end: 650, weight: 1,
    dating: { scholarly: 'Gupta empire c. 320–550 CE; Puranas take shape c. 300–1000 CE' },
    summary: 'The Gupta centuries: Kalidasa’s plays and poems, Aryabhata’s astronomy, the first stone temples at Deogarh and Sanchi, the Puranas gathering the stories of the gods. Sanskrit culture reaches Southeast Asia.',
    library: ['पुराण', 'purana', 'कालिदास', 'kalidasa', 'विष्णु पुराण', 'भागवत'],
  },
  {
    id: 'darshana', name: 'Age of the Acharyas and early Bhakti', sa: 'आचार्य-भक्ति उदय', start: 600, end: 1000, weight: 1,
    dating: { scholarly: 'Tamil Alvars and Nayanars 6th–9th c.; Adi Shankara c. 788–820 CE', traditional: 'Shankara’s traditional dates are 509–477 BCE in the records of the mathas he founded' },
    summary: 'In the Tamil country the Alvars and Nayanars sing of Vishnu and Shiva in the people’s tongue, and the first great temples rise. Adi Shankara writes the commentaries of Advaita Vedanta and founds the four mathas. Tantra and the Agamas shape worship.',
    library: ['शङ्कर', 'shankara', 'advaita', 'अद्वैत', 'ஆழ்வார்', 'நாயன்மார்', 'திருக்குறள்'],
  },
  {
    id: 'bhakti', name: 'Age of Bhakti', sa: 'भक्ति काल', start: 1000, end: 1700, weight: 1.3,
    dating: { scholarly: '11th–17th centuries CE' },
    summary: 'Ramanuja, Madhva, Basava, Jnaneshwar, Kabir, Nanak, Chaitanya, Mirabai, Surdas and Tulsidas: devotion sung in Tamil, Kannada, Marathi, Hindi, Bengali and Braj. The Vijayanagara empire and the Marathas under Shivaji guard the temples and the tradition.',
    library: ['रामानुज', 'ramanuja', 'मध्व', 'कबीर', 'kabir', 'तुलसीदास', 'रामचरितमानस', 'मीरा', 'चैतन्य'],
  },
  {
    id: 'colonial', name: 'Colonial age and renaissance', sa: 'नवजागरण काल', start: 1757, end: 1947, weight: 1,
    dating: { scholarly: '1757–1947 CE' },
    summary: 'Under British rule the tradition examines itself and answers: Ram Mohan Roy and the Brahmo Samaj, Dayananda and the Arya Samaj, Ramakrishna and Vivekananda, Aurobindo, Ramana Maharshi, Gandhi’s satyagraha. The Vedas and Gita are printed and read across the world.',
    library: ['विवेकानन्द', 'vivekananda', 'रामकृष्ण', 'दयानन्द', 'अरविन्द', 'aurobindo', 'गांधी', 'gandhi'],
  },
  {
    id: 'modern', name: 'Independence to today', sa: 'स्वतन्त्र भारत', start: 1947, end: 2026, weight: 0.9,
    dating: { scholarly: '1947 CE onward' },
    summary: 'A free India, a diaspora on every continent, yoga practised by hundreds of millions, the Kumbh Mela as the largest gathering on earth, and the temples, texts and teachers of Sanatana Dharma reaching further than at any time in its history.',
    library: ['yoga', 'योग', 'kumbh', 'कुम्भ', 'ayodhya', 'अयोध्या'],
  },
];

export const EVENTS = [
  { era: 'sindhu', year: -2600, date: 'c. 2600 BCE', name: 'Mature Harappan cities', sa: 'हड़प्पा नगर', summary: 'Harappa, Mohenjo-daro and Dholavira at their height: grid streets, covered drains, standard weights and a script of some 400 signs, still undeciphered.', library: ['harappa', 'mohenjo'] },
  { era: 'sindhu', year: -1900, date: 'c. 1900 BCE', name: 'The Sarasvati dries', sa: 'सरस्वती', summary: 'The river praised in the Rig Veda as "best of mothers, best of rivers" weakens as its Himalayan feeders shift. Settlements move east toward the Ganga.', library: ['सरस्वती', 'sarasvati'] },
  { era: 'vedic', year: -1400, date: 'c. 1500–1200 BCE (scholarly)', name: 'The Rig Veda', sa: 'ऋग्वेदः', summary: '1,028 hymns in ten mandalas, the oldest text of the tradition, preserved by recitation with a fidelity no manuscript could match. Traditionally without human author.', library: ['ऋग्वेद', 'rig veda', 'अग्निमीळे'] },
  { era: 'vedic', year: -1000, date: 'c. 1200–900 BCE', name: 'Yajur, Sama and Atharva Vedas', sa: 'यजुः-साम-अथर्व', summary: 'The formulas of the sacrifice, the melodies for the Soma rite, and the hymns of healing, protection and daily life.', library: ['यजुर्वेद', 'सामवेद', 'अथर्ववेद'] },
  { era: 'vedic', year: -800, date: 'c. 900–600 BCE', name: 'The Brahmanas and Aranyakas', sa: 'ब्राह्मण-आरण्यक', summary: 'Prose explanations of the rites, and the forest books that begin to ask what the sacrifice means within.', library: ['ब्राह्मण', 'शतपथ', 'आरण्यक'] },
  { era: 'upanishadic', year: -700, date: 'c. 800–600 BCE', name: 'Brihadaranyaka and Chandogya', sa: 'बृहदारण्यक · छान्दोग्य', summary: 'The oldest and longest Upanishads. Yajnavalkya on the Self that cannot be known as an object; Uddalaka’s "tat tvam asi", that art thou.', library: ['बृहदारण्यक', 'छान्दोग्य', 'तत्त्वमसि'] },
  { era: 'upanishadic', year: -500, date: 'c. 6th–5th century BCE', name: 'The Buddha and Mahavira', sa: 'बुद्ध · महावीर', summary: 'The shramana teachers of the Ganga plain. Their movements grow alongside the Vedic tradition and in dialogue with it for the next thousand years.', library: ['buddha', 'बुद्ध', 'jain', 'महावीर'] },
  { era: 'upanishadic', year: -400, date: 'c. 4th century BCE', name: 'Panini’s Ashtadhyayi', sa: 'अष्टाध्यायी', summary: 'Sanskrit described in 3,959 rules, the most complete grammar of any language until modern times. It fixes the classical language for all that follows.', library: ['पाणिनि', 'panini', 'व्याकरण'] },
  { era: 'epic', year: -300, date: 'c. 5th–1st century BCE (scholarly); Treta Yuga (traditional)', name: 'Valmiki’s Ramayana', sa: 'रामायणम्', summary: 'The adi-kavya, the first poem: 24,000 verses on Rama, Sita, Lakshmana and Hanuman, and on how a person keeps dharma when everything is taken away.', library: ['रामायण', 'ramayana', 'वाल्मीकि', 'राम'] },
  { era: 'epic', year: -200, date: 'c. 400 BCE–400 CE (scholarly); war c. 3100 BCE (traditional)', name: 'The Mahabharata', sa: 'महाभारतम्', summary: 'At 100,000 verses the longest poem in the world. "What is here is found elsewhere; what is not here is nowhere." The Kurukshetra war, and within it the Bhagavad Gita.', library: ['महाभारत', 'mahabharata', 'व्यास', 'कुरुक्षेत्र'] },
  { era: 'epic', year: -150, date: 'c. 2nd century BCE (scholarly)', name: 'The Bhagavad Gita', sa: 'श्रीमद्भगवद्गीता', summary: 'Krishna’s teaching to Arjuna on the field of battle: action without attachment, knowledge, devotion. Seven hundred verses that every later school has made its own.', library: ['गीता', 'bhagavad gita', 'कर्मण्येवाधिकारस्ते', 'अर्जुन'] },
  { era: 'epic', year: 0, date: 'c. 200 BCE–200 CE', name: 'Manusmriti and the Dharmashastras', sa: 'मनुस्मृति', summary: 'The law books: the four ashramas of life, the duties of each station, rites from birth to death. Debated and reinterpreted in every age since.', library: ['मनुस्मृति', 'manu', 'धर्मशास्त्र'] },
  { era: 'epic', year: 200, date: 'c. 2nd–4th century CE', name: 'Patanjali’s Yoga Sutras', sa: 'योगसूत्राणि', summary: '"Yoga is the stilling of the movements of the mind." The eight limbs, from restraint to samadhi, in 196 aphorisms.', library: ['योगसूत्र', 'yoga sutra', 'पतञ्जलि', 'patanjali'] },
  { era: 'mauryan', year: -300, date: 'c. 300 BCE', name: 'Chanakya’s Arthashastra', sa: 'अर्थशास्त्रम्', summary: 'The science of wealth and statecraft: taxation, espionage, war and the welfare of subjects, written for the Mauryan court.', library: ['अर्थशास्त्र', 'arthashastra', 'कौटिल्य', 'chanakya'] },
  { era: 'mauryan', year: -260, date: 'c. 268–232 BCE', name: 'Ashoka’s edicts', sa: 'अशोक', summary: 'After Kalinga the emperor renounces conquest and has his dhamma carved on rocks and pillars from Kandahar to Karnataka, in Prakrit, Greek and Aramaic.', library: ['ashoka', 'अशोक', 'edict'] },
  { era: 'classical', year: 400, date: 'c. 4th–5th century CE', name: 'Kalidasa', sa: 'कालिदासः', summary: 'Shakuntala, Meghaduta, Kumarasambhava, Raghuvamsha: Sanskrit poetry and drama at their summit.', library: ['कालिदास', 'kalidasa', 'शाकुन्तल', 'मेघदूत'] },
  { era: 'classical', year: 499, date: '499 CE', name: 'Aryabhata’s Aryabhatiya', sa: 'आर्यभटीयम्', summary: 'The earth turns on its axis; eclipses are shadows; pi is 3.1416; the place-value system with zero. Written at the age of twenty-three.', library: ['आर्यभट', 'aryabhata', 'ज्योतिष'] },
  { era: 'classical', year: 500, date: 'c. 300–1000 CE', name: 'The Puranas', sa: 'पुराणानि', summary: 'Eighteen great Puranas: the stories of Vishnu, Shiva and Devi, the lineages of kings and sages, the geography of the cosmos, the tirthas and the vratas. The Bhagavata Purana becomes the scripture of Krishna devotion.', library: ['पुराण', 'purana', 'भागवत', 'विष्णु पुराण', 'शिव पुराण'] },
  { era: 'darshana', year: 650, date: 'c. 6th–9th century CE', name: 'The Alvars and Nayanars', sa: 'ஆழ்வார்கள் · நாயன்மார்கள்', summary: 'Twelve Vaishnava and sixty-three Shaiva saints sing in Tamil at the shrines of the south. Their hymns, the Divya Prabandham and the Tevaram, are sung in temples to this day.', library: ['ஆழ்வார்', 'alvar', 'நாயன்மார்', 'nayanar', 'திருவாய்மொழி'] },
  { era: 'darshana', year: 800, date: 'c. 788–820 CE (scholarly); 509–477 BCE (traditional)', name: 'Adi Shankara', sa: 'आदिशङ्कराचार्यः', summary: 'Commentaries on the Upanishads, the Gita and the Brahma Sutras establish Advaita Vedanta; the four mathas at Sringeri, Puri, Dwarka and Badrinath; a life of thirty-two years.', library: ['शङ्कर', 'shankara', 'अद्वैत', 'advaita', 'विवेकचूडामणि'] },
  { era: 'darshana', year: 900, date: 'c. 9th–10th century CE', name: 'Tantra and the Agamas', sa: 'आगम-तन्त्र', summary: 'The Shaiva, Vaishnava and Shakta Agamas set out temple building, image worship and initiation; Kashmir Shaivism under Abhinavagupta reaches its philosophical height.', library: ['आगम', 'तन्त्र', 'tantra', 'अभिनवगुप्त'] },
  { era: 'bhakti', year: 1100, date: '1017–1137 CE', name: 'Ramanuja', sa: 'रामानुजाचार्यः', summary: 'Vishishtadvaita, qualified non-dualism: the world and souls are real, as the body of God. At Srirangam he opens the temple to all.', library: ['रामानुज', 'ramanuja', 'विशिष्टाद्वैत', 'श्रीभाष्य'] },
  { era: 'bhakti', year: 1160, date: '12th century CE', name: 'Basava and the Vachanas', sa: 'ಬಸವಣ್ಣ', summary: 'In Kannada, the Lingayat saints reject caste and ritual for direct devotion to Shiva, in short spoken poems.', library: ['basava', 'vachana', 'lingayat'] },
  { era: 'bhakti', year: 1280, date: '1238–1317 CE', name: 'Madhva', sa: 'मध्वाचार्यः', summary: 'Dvaita, dualism: God, souls and world eternally distinct. Udupi becomes a centre of Krishna worship.', library: ['मध्व', 'madhva', 'द्वैत', 'dvaita'] },
  { era: 'bhakti', year: 1290, date: '1275–1296 CE', name: 'Jnaneshwar’s Jnaneshwari', sa: 'ज्ञानेश्वरी', summary: 'The Gita explained in Marathi verse, by a saint of twenty-one, opening the teaching to everyone who could not read Sanskrit.', library: ['ज्ञानेश्वर', 'jnaneshwar', 'jnaneshwari'] },
  { era: 'bhakti', year: 1336, date: '1336–1646 CE', name: 'Vijayanagara', sa: 'विजयनगर', summary: 'The empire of Hampi, protector of the southern temples and of Sanskrit and Telugu, Kannada and Tamil letters. Sayana’s commentary on the Vedas is written at its court.', library: ['vijayanagara', 'hampi', 'सायण', 'sayana'] },
  { era: 'bhakti', year: 1450, date: '15th century CE', name: 'Kabir', sa: 'कबीर', summary: 'A weaver of Varanasi, singing in plain Hindi of the one God beyond temple and mosque. His couplets are on every tongue in north India.', library: ['कबीर', 'kabir', 'दोहा'] },
  { era: 'bhakti', year: 1510, date: '1486–1534 CE', name: 'Chaitanya Mahaprabhu', sa: 'चैतन्य महाप्रभु', summary: 'Ecstatic devotion to Krishna through the chanting of the name, sankirtana, in Bengal and Puri. The source of Gaudiya Vaishnavism.', library: ['चैतन्य', 'chaitanya', 'कीर्तन', 'हरे कृष्ण'] },
  { era: 'bhakti', year: 1574, date: '1574 CE', name: 'Tulsidas’s Ramcharitmanas', sa: 'रामचरितमानस', summary: 'The story of Rama in Awadhi, the "lake of Rama’s deeds", recited in homes and at the Ramlila across the north for four and a half centuries.', library: ['रामचरितमानस', 'तुलसीदास', 'tulsidas', 'हनुमान चालीसा'] },
  { era: 'bhakti', year: 1674, date: '1674 CE', name: 'Shivaji’s coronation', sa: 'छत्रपति शिवाजी', summary: 'At Raigad, Shivaji is crowned Chhatrapati by Vedic rite, establishing Hindavi Swarajya, the Maratha state that would reach across India.', library: ['शिवाजी', 'shivaji', 'maratha'] },
  { era: 'colonial', year: 1828, date: '1828 CE', name: 'Ram Mohan Roy and the Brahmo Samaj', sa: 'ब्रह्म समाज', summary: 'Reform grounded in the Upanishads: one formless God, no image worship, an end to sati. The beginning of the Bengal renaissance.', library: ['राममोहन', 'brahmo', 'ram mohan roy'] },
  { era: 'colonial', year: 1875, date: '1875 CE', name: 'Dayananda and the Arya Samaj', sa: 'आर्य समाज', summary: '"Back to the Vedas." Dayananda Saraswati’s Satyarth Prakash calls for the Vedas alone as authority, and for education and social reform.', library: ['दयानन्द', 'dayananda', 'आर्य समाज', 'सत्यार्थ प्रकाश'] },
  { era: 'colonial', year: 1886, date: '1836–1886 CE', name: 'Ramakrishna Paramahamsa', sa: 'रामकृष्ण परमहंस', summary: 'The priest of Dakshineswar, who practised every path and found them all leading to the one Mother. His disciples carried his realisation to the world.', library: ['रामकृष्ण', 'ramakrishna', 'कथामृत'] },
  { era: 'colonial', year: 1893, date: '11 September 1893', name: 'Vivekananda at Chicago', sa: 'स्वामी विवेकानन्द', summary: '"Sisters and brothers of America." At the Parliament of Religions, Vedanta is presented to the West as a living philosophy. The Ramakrishna Mission follows in 1897.', library: ['विवेकानन्द', 'vivekananda', 'vedanta', 'raja yoga'] },
  { era: 'colonial', year: 1926, date: '1872–1950 CE', name: 'Sri Aurobindo', sa: 'श्री अरविन्द', summary: 'From revolution to the ashram at Pondicherry: the integral yoga, the Essays on the Gita, The Life Divine, and a reading of the Vedas as the record of inner experience.', library: ['अरविन्द', 'aurobindo', 'integral yoga', 'life divine'] },
  { era: 'colonial', year: 1930, date: '1930 CE', name: 'Gandhi’s salt march', sa: 'दाण्डी यात्रा', summary: 'Satyagraha, truth-force, drawn by Gandhi from the Gita and the Jain ideal of ahimsa, becomes the method of a nation and of movements across the world.', library: ['गांधी', 'gandhi', 'अहिंसा', 'satyagraha'] },
  { era: 'colonial', year: 1940, date: '1879–1950 CE', name: 'Ramana Maharshi', sa: 'रमण महर्षि', summary: 'At Arunachala, the silent teaching of self-enquiry: "Who am I?" Seekers from every tradition come to sit with him.', library: ['रमण', 'ramana', 'who am i', 'अरुणाचल'] },
  { era: 'modern', year: 1950, date: '26 January 1950', name: 'The Constitution of India', sa: 'भारत का संविधान', summary: 'A free republic, with freedom of religion and equal citizenship written into its foundation.', library: ['constitution', 'संविधान'] },
  { era: 'modern', year: 1966, date: '1960s onward', name: 'Yoga and Vedanta go global', sa: 'विश्वव्यापी योग', summary: 'Teachers from Sivananda’s Rishikesh, from Krishnamacharya’s Mysore, and the Hare Krishna movement carry asana, meditation and the Gita into every country.', library: ['योग', 'yoga', 'sivananda', 'iyengar'] },
  { era: 'modern', year: 2015, date: '21 June 2015', name: 'International Day of Yoga', sa: 'अन्तर्राष्ट्रीय योग दिवस', summary: 'Declared by the United Nations at India’s proposal, with 177 nations co-sponsoring, the broadest support any such resolution had received.', library: ['योग', 'yoga'] },
  { era: 'modern', year: 2024, date: '22 January 2024', name: 'Ram Mandir, Ayodhya', sa: 'राम मन्दिर', summary: 'The consecration of the temple at Rama’s birthplace, after a dispute that had run for generations.', library: ['अयोध्या', 'ayodhya', 'राम'] },
  { era: 'modern', year: 2025, date: 'January–February 2025', name: 'Maha Kumbh at Prayagraj', sa: 'महाकुम्भ', summary: 'The gathering at the confluence of Ganga, Yamuna and the unseen Sarasvati, held every twelve years, with the largest attendance of any event on earth.', library: ['कुम्भ', 'kumbh', 'प्रयाग', 'त्रिवेणी'] },
];

/** Years formatted for people: 3102 BCE, 499 CE, 1893. */
export function formatYear(y) {
  if (y < 0) return `${-y} BCE`;
  if (y < 1000) return `${y} CE`;
  return String(y);
}
