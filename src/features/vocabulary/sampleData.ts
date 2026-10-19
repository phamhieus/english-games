import type { VocabularyDraft } from '@/services/database/repositories';

/** Starter demo collection. Users can delete it and use their own words. */
export const SAMPLE_COLLECTION_NAME = 'Starter Pack';

export const SAMPLE_WORDS: VocabularyDraft[] = [
  { english: 'apple', vietnamese: 'quả táo', pronunciation: '/ˈæp.əl/', partOfSpeech: 'noun', level: 'A1', example: 'I eat an apple every morning.' },
  { english: 'family', vietnamese: 'gia đình', pronunciation: '/ˈfæm.əl.i/', partOfSpeech: 'noun', level: 'A1', example: 'My family lives in Hanoi.' },
  { english: 'beautiful', vietnamese: 'xinh đẹp', pronunciation: '/ˈbjuː.tɪ.fəl/', partOfSpeech: 'adjective', level: 'A1', example: 'What a beautiful day!' },
  { english: 'kitchen', vietnamese: 'nhà bếp', pronunciation: '/ˈkɪtʃ.ən/', partOfSpeech: 'noun', level: 'A1', example: 'Mom is cooking in the kitchen.' },
  { english: 'weather', vietnamese: 'thời tiết', pronunciation: '/ˈweð.ər/', partOfSpeech: 'noun', level: 'A1', example: 'The weather is nice today.' },
  { english: 'friendly', vietnamese: 'thân thiện', pronunciation: '/ˈfrend.li/', partOfSpeech: 'adjective', level: 'A2', example: 'Our neighbours are very friendly.' },
  { english: 'journey', vietnamese: 'chuyến đi', pronunciation: '/ˈdʒɜː.ni/', partOfSpeech: 'noun', level: 'A2', example: 'The journey took three hours.' },
  { english: 'borrow', vietnamese: 'mượn', pronunciation: '/ˈbɒr.əʊ/', partOfSpeech: 'verb', level: 'A2', example: 'Can I borrow your pen?' },
  { english: 'healthy', vietnamese: 'khỏe mạnh', pronunciation: '/ˈhel.θi/', partOfSpeech: 'adjective', level: 'A2', example: 'Eating vegetables keeps you healthy.' },
  { english: 'neighbour', vietnamese: 'hàng xóm', pronunciation: '/ˈneɪ.bər/', partOfSpeech: 'noun', level: 'A2', example: 'My neighbour has a cute dog.' },
  { english: 'look after', vietnamese: 'chăm sóc', partOfSpeech: 'phrasal verb', level: 'A2', example: 'She looks after her little brother.' },
  { english: 'achieve', vietnamese: 'đạt được', pronunciation: '/əˈtʃiːv/', partOfSpeech: 'verb', level: 'B1', example: 'She achieved her goal.' },
  { english: 'environment', vietnamese: 'môi trường', pronunciation: '/ɪnˈvaɪ.rən.mənt/', partOfSpeech: 'noun', level: 'B1', example: 'We must protect the environment.' },
  { english: 'opportunity', vietnamese: 'cơ hội', pronunciation: '/ˌɒp.əˈtʃuː.nə.ti/', partOfSpeech: 'noun', level: 'B1', example: 'This job is a great opportunity.' },
  { english: 'improve', vietnamese: 'cải thiện', pronunciation: '/ɪmˈpruːv/', partOfSpeech: 'verb', level: 'B1', example: 'I want to improve my English.' },
  { english: 'experience', vietnamese: 'kinh nghiệm', pronunciation: '/ɪkˈspɪə.ri.əns/', partOfSpeech: 'noun', level: 'B1', example: 'He has a lot of teaching experience.' },
  { english: 'decision', vietnamese: 'quyết định', pronunciation: '/dɪˈsɪʒ.ən/', partOfSpeech: 'noun', level: 'B1', example: 'It was a difficult decision.' },
  { english: 'well-known', vietnamese: 'nổi tiếng', partOfSpeech: 'adjective', level: 'B1', example: 'He is a well-known writer.' },
  { english: 'give up', vietnamese: 'từ bỏ', partOfSpeech: 'phrasal verb', level: 'B1', example: "Don't give up on your dreams." },
  { english: 'reliable', vietnamese: 'đáng tin cậy', pronunciation: '/rɪˈlaɪ.ə.bəl/', partOfSpeech: 'adjective', level: 'B2', example: 'We need a reliable source.' },
  { english: 'consequence', vietnamese: 'hậu quả', pronunciation: '/ˈkɒn.sɪ.kwəns/', partOfSpeech: 'noun', level: 'B2', example: 'Every action has a consequence.' },
  { english: 'persuade', vietnamese: 'thuyết phục', pronunciation: '/pəˈsweɪd/', partOfSpeech: 'verb', level: 'B2', example: 'I persuaded him to come.' },
  { english: 'sustainable', vietnamese: 'bền vững', pronunciation: '/səˈsteɪ.nə.bəl/', partOfSpeech: 'adjective', level: 'B2', example: 'We need sustainable energy.' },
  { english: 'take into account', vietnamese: 'tính đến, xem xét', partOfSpeech: 'phrase', level: 'B2', example: 'Take the cost into account.' },
  { english: "it's up to you", vietnamese: 'tùy bạn quyết định', partOfSpeech: 'phrase', level: 'A2', example: "Pizza or pasta? It's up to you." },
  { english: 'ambiguous', vietnamese: 'mơ hồ, không rõ ràng', pronunciation: '/æmˈbɪɡ.ju.əs/', partOfSpeech: 'adjective', level: 'C1', example: 'The instructions were ambiguous.' },
  { english: 'meticulous', vietnamese: 'tỉ mỉ', pronunciation: '/məˈtɪk.jə.ləs/', partOfSpeech: 'adjective', level: 'C1', example: 'She is meticulous about details.' },
  { english: 'resilient', vietnamese: 'kiên cường', pronunciation: '/rɪˈzɪl.i.ənt/', partOfSpeech: 'adjective', level: 'C1', example: 'Children are often very resilient.' },
  { english: 'umbrella', vietnamese: 'cái ô', pronunciation: '/ʌmˈbrel.ə/', partOfSpeech: 'noun', level: 'A1', example: 'Take an umbrella, it might rain.' },
  { english: 'library', vietnamese: 'thư viện', pronunciation: '/ˈlaɪ.brər.i/', partOfSpeech: 'noun', level: 'A1', example: 'I study at the library.' },
];
