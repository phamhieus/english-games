import type { CefrLevel } from '@/types';
import type { VocabularyDraft } from '@/services/database/repositories';

/**
 * Built-in word sets. Their collection and word ids are fixed, so two synced devices that
 * both have a pack merge into one copy.
 */
export interface WordPack {
  id: string;
  name: string;
  description: string;
  words: VocabularyDraft[];
}

type Row = [english: string, vietnamese: string, ipa: string, partOfSpeech: string, level: CefrLevel];

/** Pronunciation slides, as given: words grouped by the sound they practise (repeats included). */
export const PRONUNCIATION_SLIDES: readonly { sound: string; rows: readonly Row[] }[] = [
  {
    sound: '/p/',
    rows: [
      ['pie', 'bánh nướng có nhân', '/paɪ/', 'noun', 'A2'],
      ['pea', 'hạt đậu Hà Lan', '/piː/', 'noun', 'A2'],
      ['pen', 'cây bút', '/pen/', 'noun', 'A1'],
      ['pin', 'cái ghim', '/pɪn/', 'noun', 'A2'],
      ['pan', 'cái chảo', '/pæn/', 'noun', 'A2'],
      ['park', 'công viên', '/pɑːk/', 'noun', 'A1'],
      ['play', 'chơi', '/pleɪ/', 'verb', 'A1'],
      ['price', 'giá cả', '/praɪs/', 'noun', 'A2'],
      ['spoon', 'cái thìa', '/spuːn/', 'noun', 'A2'],
      ['cup', 'cái cốc', '/kʌp/', 'noun', 'A1'],
      ['map', 'bản đồ', '/mæp/', 'noun', 'A1'],
      ['sleep', 'ngủ', '/sliːp/', 'verb', 'A1'],
      ['paper', 'giấy', '/ˈpeɪpə/', 'noun', 'A1'],
      ['happy', 'vui vẻ', '/ˈhæpi/', 'adjective', 'A1'],
      ['apple', 'quả táo', '/ˈæpəl/', 'noun', 'A1'],
      ['people', 'mọi người', '/ˈpiːpəl/', 'noun', 'A1'],
      ['purple', 'màu tím', '/ˈpɜːpəl/', 'adjective', 'A1'],
      ['potato', 'khoai tây', '/pəˈteɪtəʊ/', 'noun', 'A1'],
    ],
  },
  {
    sound: '/b/',
    rows: [
      ['bee', 'con ong', '/biː/', 'noun', 'A2'],
      ['boy', 'cậu bé', '/bɔɪ/', 'noun', 'A1'],
      ['bag', 'cái túi', '/bæg/', 'noun', 'A1'],
      ['bed', 'cái giường', '/bed/', 'noun', 'A1'],
      ['book', 'quyển sách', '/bʊk/', 'noun', 'A1'],
      ['bus', 'xe buýt', '/bʌs/', 'noun', 'A1'],
      ['blue', 'màu xanh dương', '/bluː/', 'adjective', 'A1'],
      ['black', 'màu đen', '/blæk/', 'adjective', 'A1'],
      ['bread', 'bánh mì', '/bred/', 'noun', 'A1'],
      ['brown', 'màu nâu', '/braʊn/', 'adjective', 'A1'],
      ['cab', 'xe taxi', '/kæb/', 'noun', 'B1'],
      ['crab', 'con cua', '/kræb/', 'noun', 'B1'],
      ['baby', 'em bé', '/ˈbeɪbi/', 'noun', 'A1'],
      ['rabbit', 'con thỏ', '/ˈræbɪt/', 'noun', 'A1'],
      ['bubble', 'bong bóng', '/ˈbʌbəl/', 'noun', 'B1'],
      ['banana', 'quả chuối', '/bəˈnɑːnə/', 'noun', 'A1'],
      ['birthday', 'sinh nhật', '/ˈbɜːθdeɪ/', 'noun', 'A1'],
      ['beautiful', 'xinh đẹp', '/ˈbjuːtɪfəl/', 'adjective', 'A1'],
    ],
  },
  {
    sound: '/t/',
    rows: [
      ['tea', 'trà', '/tiː/', 'noun', 'A1'],
      ['two', 'số hai', '/tuː/', 'number', 'A1'],
      ['tie', 'cà vạt', '/taɪ/', 'noun', 'A2'],
      ['ten', 'số mười', '/ten/', 'number', 'A1'],
      ['top', 'đỉnh, phần trên cùng', '/tɒp/', 'noun', 'A2'],
      ['town', 'thị trấn', '/taʊn/', 'noun', 'A1'],
      ['tree', 'cái cây', '/triː/', 'noun', 'A1'],
      ['train', 'tàu hỏa', '/treɪn/', 'noun', 'A1'],
      ['stop', 'dừng lại', '/stɒp/', 'verb', 'A1'],
      ['cat', 'con mèo', '/kæt/', 'noun', 'A1'],
      ['boat', 'con thuyền', '/bəʊt/', 'noun', 'A1'],
      ['fast', 'nhanh', '/fɑːst/', 'adjective', 'A1'],
      ['table', 'cái bàn', '/ˈteɪbəl/', 'noun', 'A1'],
      ['ticket', 'vé', '/ˈtɪkɪt/', 'noun', 'A1'],
      ['water', 'nước', '/ˈwɔːtə/', 'noun', 'A1'],
      ['city', 'thành phố', '/ˈsɪti/', 'noun', 'A1'],
      ['potato', 'khoai tây', '/pəˈteɪtəʊ/', 'noun', 'A1'],
      ['tomato', 'cà chua', '/təˈmɑːtəʊ/', 'noun', 'A1'],
    ],
  },
  {
    sound: '/d/',
    rows: [
      ['do', 'làm', '/duː/', 'verb', 'A1'],
      ['day', 'ngày', '/deɪ/', 'noun', 'A1'],
      ['door', 'cửa ra vào', '/dɔː/', 'noun', 'A1'],
      ['dog', 'con chó', '/dɒg/', 'noun', 'A1'],
      ['duck', 'con vịt', '/dʌk/', 'noun', 'A2'],
      ['desk', 'bàn học', '/desk/', 'noun', 'A1'],
      ['dry', 'khô', '/draɪ/', 'adjective', 'A2'],
      ['dream', 'giấc mơ', '/driːm/', 'noun', 'A2'],
      ['drink', 'uống', '/drɪŋk/', 'verb', 'A1'],
      ['bed', 'cái giường', '/bed/', 'noun', 'A1'],
      ['food', 'thức ăn', '/fuːd/', 'noun', 'A1'],
      ['cold', 'lạnh', '/kəʊld/', 'adjective', 'A1'],
      ['dinner', 'bữa tối', '/ˈdɪnə/', 'noun', 'A1'],
      ['doctor', 'bác sĩ', '/ˈdɒktə/', 'noun', 'A1'],
      ['ladder', 'cái thang', '/ˈlædə/', 'noun', 'B1'],
      ['ready', 'sẵn sàng', '/ˈredi/', 'adjective', 'A1'],
      ['window', 'cửa sổ', '/ˈwɪndəʊ/', 'noun', 'A1'],
      ['delicious', 'ngon', '/dɪˈlɪʃəs/', 'adjective', 'A2'],
    ],
  },
  {
    sound: '/eə/',
    rows: [
      ['air', 'không khí', '/eə/', 'noun', 'A2'],
      ['hair', 'tóc', '/heə/', 'noun', 'A1'],
      ['fair', 'công bằng', '/feə/', 'adjective', 'B1'],
      ['pair', 'đôi, cặp', '/peə/', 'noun', 'A2'],
      ['bear', 'con gấu', '/beə/', 'noun', 'A2'],
      ['care', 'quan tâm, chăm sóc', '/keə/', 'verb', 'A2'],
      ['chair', 'cái ghế', '/tʃeə/', 'noun', 'A1'],
      ['share', 'chia sẻ', '/ʃeə/', 'verb', 'A2'],
      ['stare', 'nhìn chằm chằm', '/steə/', 'verb', 'B2'],
      ['spare', 'dự phòng', '/speə/', 'adjective', 'B1'],
      ['square', 'hình vuông, quảng trường', '/skweə/', 'noun', 'A2'],
      ['scared', 'sợ hãi', '/skeəd/', 'adjective', 'A2'],
      ['careful', 'cẩn thận', '/ˈkeəfəl/', 'adjective', 'A2'],
      ['careless', 'bất cẩn', '/ˈkeələs/', 'adjective', 'B1'],
      ['haircut', 'kiểu tóc, việc cắt tóc', '/ˈheəkʌt/', 'noun', 'A2'],
      ['airport', 'sân bay', '/ˈeəpɔːt/', 'noun', 'A1'],
      ['prepare', 'chuẩn bị', '/prɪˈpeə/', 'verb', 'A2'],
      ['repair', 'sửa chữa', '/rɪˈpeə/', 'verb', 'A2'],
    ],
  },
  {
    sound: '/ʊə/',
    rows: [
      ['pure', 'tinh khiết', '/pjʊə/', 'adjective', 'B2'],
      ['cure', 'chữa khỏi', '/kjʊə/', 'verb', 'B1'],
      ['lure', 'dụ dỗ, mồi nhử', '/lʊə/', 'verb', 'C1'],
      ['tour', 'chuyến tham quan', '/tʊə/', 'noun', 'A2'],
      ['secure', 'an toàn, chắc chắn', '/sɪˈkjʊə/', 'adjective', 'B2'],
      ['obscure', 'mơ hồ, khó hiểu', '/əbˈskjʊə/', 'adjective', 'C1'],
      ['endure', 'chịu đựng', '/ɪnˈdjʊə/', 'verb', 'C1'],
      ['mature', 'trưởng thành', '/məˈtʃʊə/', 'adjective', 'B2'],
      ['sure', 'chắc chắn', '/ʃʊə/ or /ʃɔː/', 'adjective', 'A1'],
      ['poor', 'nghèo', '/pʊə/ or /pɔː/', 'adjective', 'A2'],
      ['tour', 'chuyến tham quan', '/tʊə/ or /tɔː/', 'noun', 'A2'],
      ['lure', 'dụ dỗ, mồi nhử', '/lʊə/ or /lɔː/', 'verb', 'C1'],
    ],
  },
  {
    sound: '/aʊ/',
    rows: [
      ['now', 'bây giờ', '/naʊ/', 'adverb', 'A1'],
      ['how', 'như thế nào', '/haʊ/', 'adverb', 'A1'],
      ['cow', 'con bò', '/kaʊ/', 'noun', 'A2'],
      ['out', 'ra ngoài', '/aʊt/', 'adverb', 'A1'],
      ['down', 'xuống', '/daʊn/', 'adverb', 'A1'],
      ['town', 'thị trấn', '/taʊn/', 'noun', 'A1'],
      ['house', 'ngôi nhà', '/haʊs/', 'noun', 'A1'],
      ['loud', 'to, ồn', '/laʊd/', 'adjective', 'A2'],
      ['cloud', 'đám mây', '/klaʊd/', 'noun', 'A2'],
      ['brown', 'màu nâu', '/braʊn/', 'adjective', 'A1'],
      ['found', 'tìm thấy (quá khứ của find)', '/faʊnd/', 'verb', 'A1'],
      ['count', 'đếm', '/kaʊnt/', 'verb', 'A2'],
      ['about', 'về (điều gì)', '/əˈbaʊt/', 'preposition', 'A1'],
      ['around', 'xung quanh', '/əˈraʊnd/', 'preposition', 'A1'],
      ['allow', 'cho phép', '/əˈlaʊ/', 'verb', 'B1'],
      ['without', 'không có', '/wɪˈðaʊt/', 'preposition', 'A2'],
      ['thousand', 'một nghìn', '/ˈθaʊzənd/', 'number', 'A1'],
      ['mountain', 'ngọn núi', '/ˈmaʊntɪn/', 'noun', 'A1'],
    ],
  },
  {
    sound: '/ɪə/',
    rows: [
      ['ear', 'cái tai', '/ɪə/', 'noun', 'A2'],
      ['hear', 'nghe thấy', '/hɪə/', 'verb', 'A1'],
      ['here', 'ở đây', '/hɪə/', 'adverb', 'A1'],
      ['near', 'gần', '/nɪə/', 'preposition', 'A1'],
      ['dear', 'thân mến', '/dɪə/', 'adjective', 'A1'],
      ['year', 'năm', '/jɪə/', 'noun', 'A1'],
      ['beard', 'râu', '/bɪəd/', 'noun', 'B1'],
      ['clear', 'rõ ràng', '/klɪə/', 'adjective', 'A2'],
      ['cheer', 'cổ vũ', '/tʃɪə/', 'verb', 'B1'],
      ['pier', 'cầu tàu', '/pɪə/', 'noun', 'B2'],
      ['fierce', 'dữ dội, hung dữ', '/fɪəs/', 'adjective', 'B2'],
      ['weird', 'kỳ lạ', '/wɪəd/', 'adjective', 'B1'],
      ['weary', 'mệt mỏi', '/ˈwɪəri/', 'adjective', 'C1'],
      ['nearly', 'gần như', '/ˈnɪəli/', 'adverb', 'A2'],
      ['yearly', 'hằng năm', '/ˈjɪəli/', 'adjective', 'B2'],
      ['career', 'sự nghiệp', '/kəˈrɪə/', 'noun', 'A2'],
      ['appear', 'xuất hiện', '/əˈpɪə/', 'verb', 'B1'],
      ['engineer', 'kỹ sư', '/ˌendʒɪˈnɪə/', 'noun', 'A2'],
    ],
  },
  {
    sound: '/ɔɪ/',
    rows: [
      ['boy', 'cậu bé', '/bɔɪ/', 'noun', 'A1'],
      ['toy', 'đồ chơi', '/tɔɪ/', 'noun', 'A2'],
      ['joy', 'niềm vui', '/dʒɔɪ/', 'noun', 'B1'],
      ['oil', 'dầu', '/ɔɪl/', 'noun', 'A2'],
      ['coin', 'đồng xu', '/kɔɪn/', 'noun', 'A2'],
      ['join', 'tham gia', '/dʒɔɪn/', 'verb', 'A2'],
      ['noise', 'tiếng ồn', '/nɔɪz/', 'noun', 'A2'],
      ['choice', 'sự lựa chọn', '/tʃɔɪs/', 'noun', 'A2'],
      ['voice', 'giọng nói', '/vɔɪs/', 'noun', 'A2'],
      ['point', 'điểm', '/pɔɪnt/', 'noun', 'A2'],
      ['spoil', 'làm hỏng', '/spɔɪl/', 'verb', 'B2'],
      ['joint', 'khớp xương', '/dʒɔɪnt/', 'noun', 'B2'],
      ['enjoy', 'thích thú, tận hưởng', '/ɪnˈdʒɔɪ/', 'verb', 'A1'],
      ['annoy', 'làm phiền', '/əˈnɔɪ/', 'verb', 'B1'],
      ['avoid', 'tránh', '/əˈvɔɪd/', 'verb', 'B1'],
      ['noisy', 'ồn ào', '/ˈnɔɪzi/', 'adjective', 'A2'],
      ['loyal', 'trung thành', '/ˈlɔɪəl/', 'adjective', 'B2'],
      ['employer', 'chủ lao động', '/ɪmˈplɔɪə/', 'noun', 'B1'],
    ],
  },
  {
    sound: '/əʊ/',
    rows: [
      ['go', 'đi', '/gəʊ/', 'verb', 'A1'],
      ['no', 'không', '/nəʊ/', 'determiner', 'A1'],
      ['so', 'vì vậy', '/səʊ/', 'conjunction', 'A1'],
      ['show', 'cho xem', '/ʃəʊ/', 'verb', 'A1'],
      ['home', 'nhà, mái ấm', '/həʊm/', 'noun', 'A1'],
      ['boat', 'con thuyền', '/bəʊt/', 'noun', 'A1'],
      ['coat', 'áo khoác', '/kəʊt/', 'noun', 'A1'],
      ['phone', 'điện thoại', '/fəʊn/', 'noun', 'A1'],
      ['road', 'con đường', '/rəʊd/', 'noun', 'A1'],
      ['stone', 'hòn đá', '/stəʊn/', 'noun', 'A2'],
      ['close', 'đóng (cửa)', '/kləʊz/', 'verb', 'A1'],
      ['snow', 'tuyết', '/snəʊ/', 'noun', 'A1'],
      ['open', 'mở', '/ˈəʊpən/', 'verb', 'A1'],
      ['only', 'chỉ', '/ˈəʊnli/', 'adverb', 'A1'],
      ['over', 'phía trên, qua', '/ˈəʊvə/', 'preposition', 'A1'],
      ['hello', 'xin chào', '/həˈləʊ/', 'exclamation', 'A1'],
      ['hotel', 'khách sạn', '/həʊˈtel/', 'noun', 'A1'],
      ['October', 'tháng Mười', '/ɒkˈtəʊbə/', 'noun', 'A1'],
    ],
  },
];

/**
 * One draft per word: a repeated word adds its sound to the tags, and an entry with more
 * pronunciations ("/tʊə/ or /tɔː/") replaces a shorter one.
 */
export function packWords(groups: readonly { sound: string; rows: readonly Row[] }[]): VocabularyDraft[] {
  const byWord = new Map<string, VocabularyDraft>();
  for (const { sound, rows } of groups) {
    for (const [english, vietnamese, pronunciation, partOfSpeech, level] of rows) {
      const key = english.toLowerCase();
      const seen = byWord.get(key);
      if (!seen) {
        byWord.set(key, { english, vietnamese, pronunciation, partOfSpeech, level, tags: [`sound ${sound}`] });
        continue;
      }
      const tag = `sound ${sound}`;
      if (!seen.tags?.includes(tag)) seen.tags = [...(seen.tags ?? []), tag];
      if (pronunciation.length > (seen.pronunciation?.length ?? 0) && pronunciation.includes(seen.pronunciation ?? '')) seen.pronunciation = pronunciation;
    }
  }
  return [...byWord.values()];
}

/** The default set: everyday words for 10 English sounds, from the pronunciation slides. */
export const BASIC_PACK: WordPack = {
  id: 'basic',
  name: 'Basic',
  description: 'Everyday words for 10 English sounds: /p/ /b/ /t/ /d/ /eə/ /ʊə/ /aʊ/ /ɪə/ /ɔɪ/ /əʊ/. Search "sound /p/" to see one group.',
  words: packWords(PRONUNCIATION_SLIDES),
};

/** Ids of earlier built-in copies of these words, replaced by Basic. */
export const OLD_PACK_IDS: readonly string[] = ['pack-pronunciation'];

/** Stable id of a pack word, so the same pack on two devices merges into one. */
export const packWordId = (pack: WordPack, english: string) => `${pack.id}:${english.toLowerCase()}`;
