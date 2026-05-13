const APPROVED_BY_SYSTEM = 'system';
const APPROVED_AT = '2026-05-01';
const DEFAULT_START_ON = '2026-02-01';
const DEFAULT_END_ON = '2026-06-01';

export const SHUTIS_SCHOOLS = [
  {
    id: 'must-bas',
    name: 'Барилга, архитектурын сургууль',
    picture: '/schools/must-bas.png',
    approved_by: APPROVED_BY_SYSTEM,
    approved_at: APPROVED_AT,
    priority: 10,
    code: 'БАС',
    focus: 'Барилга, архитектур, хот байгуулалт',
  },
  {
    id: 'must-buhs',
    name: 'Бизнесийн удирдлага, хүмүүнлэгийн сургууль',
    picture: '/schools/must-buhs.png',
    approved_by: APPROVED_BY_SYSTEM,
    approved_at: APPROVED_AT,
    priority: 20,
    code: 'БУХС',
    focus: 'Менежмент, эдийн засаг, хүмүүнлэг',
  },
  {
    id: 'must-uts',
    name: 'Үйлдвэрлэлийн технологийн сургууль',
    picture: '/schools/must-uts.png',
    approved_by: APPROVED_BY_SYSTEM,
    approved_at: APPROVED_AT,
    priority: 30,
    code: 'ҮТС',
    focus: 'Хүнс, хөнгөн үйлдвэрлэл, технологи',
  },
  {
    id: 'must-guus',
    name: 'Геологи, уул уурхайн сургууль',
    picture: '/schools/must-guus.png',
    approved_by: APPROVED_BY_SYSTEM,
    approved_at: APPROVED_AT,
    priority: 40,
    code: 'ГУУС',
    focus: 'Геологи, уул уурхай, газрын тос',
  },
  {
    id: 'must-mhts',
    name: 'Мэдээлэл, холбооны технологийн сургууль',
    picture: '/schools/must-mhts.png',
    approved_by: APPROVED_BY_SYSTEM,
    approved_at: APPROVED_AT,
    priority: 50,
    code: 'МХТС',
    focus: 'Програм хангамж, мэдээлэл, холбоо',
  },
  {
    id: 'must-ehs',
    name: 'Эрчим хүчний сургууль',
    picture: '/schools/must-ehs.png',
    approved_by: APPROVED_BY_SYSTEM,
    approved_at: APPROVED_AT,
    priority: 60,
    code: 'ЭХС',
    focus: 'Цахилгаан, дулаан, эрчим хүч',
  },
  {
    id: 'must-mts',
    name: 'Механик, тээврийн сургууль',
    picture: '/schools/must-mts.png',
    approved_by: APPROVED_BY_SYSTEM,
    approved_at: APPROVED_AT,
    priority: 70,
    code: 'МТС',
    focus: 'Механик, автомашин, тээвэр',
  },
  {
    id: 'must-hshus',
    name: 'Хэрэглээний шинжлэх ухааны сургууль',
    picture: '/schools/must-hshus.png',
    approved_by: APPROVED_BY_SYSTEM,
    approved_at: APPROVED_AT,
    priority: 80,
    code: 'ХШУС',
    focus: 'Математик, физик, хими, хэрэглээний шинжлэх ухаан',
  },
  {
    id: 'must-darkhan',
    name: 'Дархан-Уул аймаг дахь Технологийн сургууль',
    picture: '/schools/must-darkhan.png',
    approved_by: APPROVED_BY_SYSTEM,
    approved_at: APPROVED_AT,
    priority: 90,
    code: 'Дархан ТС',
    focus: 'Бүс нутгийн инженер технологийн сургалт',
  },
];

export const SHUTIS_CATEGORIES = [
  { id: 'cat-bas-core', name: 'Барилга, архитектур', picture: '/categories/bas.png', parent_id: null, school_id: 'must-bas', priority: 10 },
  { id: 'cat-buhs-core', name: 'Бизнес ба хүмүүнлэг', picture: '/categories/buhs.png', parent_id: null, school_id: 'must-buhs', priority: 20 },
  { id: 'cat-uts-core', name: 'Үйлдвэрлэлийн технологи', picture: '/categories/uts.png', parent_id: null, school_id: 'must-uts', priority: 30 },
  { id: 'cat-guus-core', name: 'Геологи, уул уурхай', picture: '/categories/guus.png', parent_id: null, school_id: 'must-guus', priority: 40 },
  { id: 'cat-mhts-core', name: 'Мэдээлэл, холбоо', picture: '/categories/mhts.png', parent_id: null, school_id: 'must-mhts', priority: 50 },
  { id: 'cat-ehs-core', name: 'Эрчим хүч', picture: '/categories/ehs.png', parent_id: null, school_id: 'must-ehs', priority: 60 },
  { id: 'cat-mts-core', name: 'Механик, тээвэр', picture: '/categories/mts.png', parent_id: null, school_id: 'must-mts', priority: 70 },
  { id: 'cat-hshus-core', name: 'Хэрэглээний шинжлэх ухаан', picture: '/categories/hshus.png', parent_id: null, school_id: 'must-hshus', priority: 80 },
  { id: 'cat-darkhan-core', name: 'Дархан технологи', picture: '/categories/darkhan.png', parent_id: null, school_id: 'must-darkhan', priority: 90 },
];

function course({
  id,
  school_id,
  name,
  description,
  priority,
  credit = 3,
  tuition_fee = 180000,
}) {
  return {
    id,
    school_id,
    name,
    clone_id: null,
    picture: `/courses/${id}.png`,
    description,
    start_on: DEFAULT_START_ON,
    end_on: DEFAULT_END_ON,
    priority,
    credit,
    tuition_fee,
  };
}

export const SCHOOL_COURSE_CATALOG = {
  'must-bas': [
    course({ id: 'bas-101', school_id: 'must-bas', name: 'Архитектурын үндэс', description: 'Архитектурын суурь ойлголт, зураглал, орон зайн зохиомж.', priority: 10, tuition_fee: 180000 }),
    course({ id: 'bas-204', school_id: 'must-bas', name: 'Барилгын бүтээц', description: 'Барилгын бүтээцийн үндсэн шийдэл, тооцооны хэрэглээ.', priority: 20, tuition_fee: 210000 }),
    course({ id: 'bas-310', school_id: 'must-bas', name: 'Хот төлөвлөлтийн төсөл', description: 'Хот байгуулалтын төлөвлөлт, орчны судалгаа, төсөл боловсруулах арга.', priority: 30, credit: 2, tuition_fee: 160000 }),
  ],
  'must-buhs': [
    course({ id: 'buhs-101', school_id: 'must-buhs', name: 'Бизнесийн удирдлагын үндэс', description: 'Байгууллагын удирдлага, төлөвлөлт, шийдвэр гаргалтын суурь.', priority: 10, tuition_fee: 170000 }),
    course({ id: 'buhs-202', school_id: 'must-buhs', name: 'Инженерийн эдийн засаг', description: 'Инженерийн төслийн өртөг, үр ашиг, санхүүгийн тооцоо.', priority: 20, tuition_fee: 180000 }),
    course({ id: 'buhs-305', school_id: 'must-buhs', name: 'Төслийн менежмент', description: 'Төслийн хамрах хүрээ, хугацаа, эрсдэл, багийн удирдлага.', priority: 30, credit: 2, tuition_fee: 150000 }),
  ],
  'must-uts': [
    course({ id: 'uts-110', school_id: 'must-uts', name: 'Үйлдвэрлэлийн процесс', description: 'Үйлдвэрлэлийн дамжлага, технологийн урсгал, процессын загварчлал.', priority: 10, tuition_fee: 190000 }),
    course({ id: 'uts-230', school_id: 'must-uts', name: 'Материал судлал', description: 'Материалын шинж чанар, бүтэц, үйлдвэрлэлийн хэрэглээ.', priority: 20, tuition_fee: 185000 }),
    course({ id: 'uts-330', school_id: 'must-uts', name: 'Чанарын удирдлага', description: 'Чанарын стандарт, хяналт, сайжруулалтын аргачлал.', priority: 30, credit: 2, tuition_fee: 145000 }),
  ],
  'must-guus': [
    course({ id: 'guus-101', school_id: 'must-guus', name: 'Ерөнхий геологи', description: 'Дэлхийн бүтэц, чулуулаг, ашигт малтмалын суурь ойлголт.', priority: 10, tuition_fee: 185000 }),
    course({ id: 'guus-250', school_id: 'must-guus', name: 'Уурхайн ашиглалтын технологи', description: 'Ил болон далд уурхайн ашиглалтын технологийн үндэс.', priority: 20, tuition_fee: 220000 }),
    course({ id: 'guus-340', school_id: 'must-guus', name: 'Газрын тосны инженерчлэл', description: 'Газрын тосны олборлолт, боловсруулалт, тоног төхөөрөмжийн ойлголт.', priority: 30, credit: 2, tuition_fee: 170000 }),
  ],
  'must-mhts': [
    course({ id: 'mhts-101', school_id: 'must-mhts', name: 'Програмчлалын үндэс', description: 'Алгоритм, өгөгдлийн төрөл, программ бичих суурь чадвар.', priority: 10, tuition_fee: 190000 }),
    course({ id: 'mhts-210', school_id: 'must-mhts', name: 'Веб систем ба технологи', description: 'Frontend, backend, API, веб системийн бүтэц ба хөгжүүлэлт.', priority: 20, tuition_fee: 210000 }),
    course({ id: 'mhts-315', school_id: 'must-mhts', name: 'Өгөгдлийн сангийн зохиомж', description: 'Өгөгдлийн загвар, SQL, харилцаат сангийн зохиомж.', priority: 30, tuition_fee: 205000 }),
  ],
  'must-ehs': [
    course({ id: 'ehs-115', school_id: 'must-ehs', name: 'Цахилгаан хэлхээ', description: 'Цахилгаан хэлхээний үндсэн хууль, тооцоо, хэмжилт.', priority: 10, tuition_fee: 195000 }),
    course({ id: 'ehs-240', school_id: 'must-ehs', name: 'Дулааны цахилгаан станц', description: 'Дулааны станцын бүтэц, ажиллагаа, тооцооны үндэс.', priority: 20, tuition_fee: 210000 }),
    course({ id: 'ehs-320', school_id: 'must-ehs', name: 'Сэргээгдэх эрчим хүч', description: 'Нар, салхи, усны сэргээгдэх эх үүсвэрийн технологи.', priority: 30, credit: 2, tuition_fee: 165000 }),
  ],
  'must-mts': [
    course({ id: 'mts-120', school_id: 'must-mts', name: 'Инженерийн механик', description: 'Статик, динамик, материалын бат бэхийн суурь ойлголт.', priority: 10, tuition_fee: 185000 }),
    course({ id: 'mts-260', school_id: 'must-mts', name: 'Автомашины бүтэц', description: 'Автомашины үндсэн систем, эд анги, ажиллагааны зарчим.', priority: 20, tuition_fee: 200000 }),
    course({ id: 'mts-350', school_id: 'must-mts', name: 'Тээврийн логистик', description: 'Тээврийн төлөвлөлт, нийлүүлэлтийн сүлжээ, логистикийн шийдэл.', priority: 30, credit: 2, tuition_fee: 155000 }),
  ],
  'must-hshus': [
    course({ id: 'hshus-101', school_id: 'must-hshus', name: 'Дээд математик', description: 'Инженерийн математик, анализ, шугаман алгебрын хэрэглээ.', priority: 10, tuition_fee: 175000 }),
    course({ id: 'hshus-130', school_id: 'must-hshus', name: 'Инженерийн физик', description: 'Механик, цахилгаан, долгион, дулааны физикийн суурь.', priority: 20, tuition_fee: 180000 }),
    course({ id: 'hshus-220', school_id: 'must-hshus', name: 'Хэрэглээний статистик', description: 'Өгөгдөл шинжилгээ, магадлал, статистик дүгнэлт.', priority: 30, credit: 2, tuition_fee: 145000 }),
  ],
  'must-darkhan': [
    course({ id: 'darkhan-101', school_id: 'must-darkhan', name: 'Инженерийн зураг зүй', description: 'Техникийн зураг, стандарт тэмдэглэгээ, CAD хэрэглээ.', priority: 10, tuition_fee: 165000 }),
    course({ id: 'darkhan-210', school_id: 'must-darkhan', name: 'Үйлдвэрлэлийн автоматжуулалт', description: 'Автомат удирдлага, мэдрэгч, үйлдвэрлэлийн систем.', priority: 20, tuition_fee: 190000 }),
    course({ id: 'darkhan-320', school_id: 'must-darkhan', name: 'Бүс нутгийн технологийн төсөл', description: 'Орон нутгийн үйлдвэрлэл, технологийн хэрэгцээнд суурилсан төсөл.', priority: 30, credit: 2, tuition_fee: 140000 }),
  ],
};

export function getFallbackSchoolCourses(schoolId) {
  return SCHOOL_COURSE_CATALOG[String(schoolId)] || [];
}

export function getFallbackSchoolCategories(schoolId) {
  return SHUTIS_CATEGORIES.filter((category) => String(category.school_id) === String(schoolId));
}

export function normalizeSchoolId(value) {
  return String(value || '').trim();
}
