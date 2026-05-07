export interface LebanonAddress {
  governorate: string;
  district: string;
  city: string;
  street: string;
  building: string;
  floor: string;
}

export const EMPTY_LEBANON_ADDRESS: LebanonAddress = {
  governorate: '', district: '', city: '', street: '', building: '', floor: '',
};

export interface District {
  name: string;
  cities: string[];
}

export interface Governorate {
  name: string;
  districts: District[];
}

export const LEBANON_REGIONS: Governorate[] = [
  {
    name: 'Beirut',
    districts: [
      {
        name: 'Beirut',
        cities: ['Achrafieh', 'Ain El Mreisseh', 'Bachoura', 'Basta', 'Hamra', 'Mazraa', 'Medawar', 'Mina El Hosn', 'Moussaitbeh', 'Rmeil', 'Saifi', 'Zokak El Blatt', 'Ras El Nab3a', 'Mar Elias', 'Verdun', 'Sanayeh'],
      },
    ],
  },
  {
    name: 'Mount Lebanon',
    districts: [
      {
        name: 'Baabda',
        cities: ['Baabda', 'Hadath', 'Chiyah', 'Haret Hreik', 'Burj El Barajneh', 'Mraijeh', 'Ouzai', 'Khalde', 'Doha', 'Aramoun', 'Shweifat', 'Chouaifat', 'Bchamoun', 'Aley'],
      },
      {
        name: 'Aley',
        cities: ['Aley', 'Bhamdoun', 'Ain Dara', 'Beit Mery', 'Broumana', 'Kfarhbab', 'Souk El Gharb', 'Deir Koubel', 'Mazraat El Chouf', 'Rechmaya'],
      },
      {
        name: 'Metn',
        cities: ['Jdeideh', 'Bourj Hammoud', 'Antelias', 'Mkalles', 'Sin El Fil', 'Dora', 'Mtayleb', 'Zalka', 'Dbayeh', 'Mansourieh', 'Bsalim', 'Bikfaya', 'Bhersaf', 'Rabieh'],
      },
      {
        name: 'Kesrouane',
        cities: ['Jounieh', 'Zouk Mikael', 'Zouk Mosbeh', 'Sarba', 'Adma', 'Ajaltoun', 'Faqra', 'Kfar Debian', 'Harissa', 'Ghazir', 'Nahr El Kalb', 'Tabarja', 'Haret Sakher'],
      },
      {
        name: 'Jbeil',
        cities: ['Jbeil (Byblos)', 'Jeita', 'Laqlouq', 'Nahr Ibrahim', 'Lehfed', 'Douma', 'Blat', 'Btaaboura'],
      },
      {
        name: 'Chouf',
        cities: ['Deir El Qamar', 'Beiteddine', 'Damour', 'Jiyeh', 'Bmahray', 'Moukhtara', 'Baadarane', 'Ain Zhalta', 'Barouk', 'Kfarmatta'],
      },
    ],
  },
  {
    name: 'North Lebanon',
    districts: [
      {
        name: 'Tripoli',
        cities: ['Tripoli', 'Mina', 'Beddawi', 'Qalamoun', 'Abou Samra', 'El Mina', 'Zgharta Road', 'Kobbe'],
      },
      {
        name: 'Zgharta',
        cities: ['Zgharta', 'Ehden', 'Miziara', 'Kfarsghab', 'Bqaatouta'],
      },
      {
        name: 'Bcharre',
        cities: ['Bcharre', 'Hadchit', 'Qnat', 'Bazoun', 'Hasroun', 'Diman'],
      },
      {
        name: 'Koura',
        cities: ['Amioun', 'Kousba', 'Btouratij', 'Daraya', 'Kfar Hazir', 'Ras Maska'],
      },
      {
        name: 'Batroun',
        cities: ['Batroun', 'Tannourine', 'Douma', 'Kfour', 'Mayfouq', 'Seraal'],
      },
      {
        name: 'Miniyeh-Danniyeh',
        cities: ['Minyeh', 'Sir El Dinniyye', 'Kousba', 'Beino', 'Qelhat'],
      },
    ],
  },
  {
    name: 'Akkar',
    districts: [
      {
        name: 'Akkar',
        cities: ['Halba', 'Andqet', 'Qoubaiyat', 'Fnaidek', 'Rahbe', 'Akkar El Attiqa', 'Hrar', 'Bire', 'Kherbet Daoud'],
      },
    ],
  },
  {
    name: 'South Lebanon',
    districts: [
      {
        name: 'Sidon',
        cities: ['Sidon (Saida)', 'Joun', 'Kfar Falous', 'Ghaziyeh', 'Rmeileh', 'Sarafand', 'Naameh', 'Damour'],
      },
      {
        name: 'Jezzine',
        cities: ['Jezzine', 'Roum', 'Bkassine', 'Aabey', 'Kfarhoune'],
      },
      {
        name: 'Tyre',
        cities: ['Tyre (Sour)', 'Qana', 'Tibnin', 'Jwaya', 'Majdel Zoun', 'Deir Qanoun En Nahr', 'Chamaa'],
      },
    ],
  },
  {
    name: 'Nabatieh',
    districts: [
      {
        name: 'Nabatieh',
        cities: ['Nabatieh', 'Kafra', 'Kfar Roummane', 'Habbouch', 'Siddiqine'],
      },
      {
        name: 'Bint Jbeil',
        cities: ['Bint Jbeil', 'Maroun El Ras', 'Aita El Shaab', 'Yater', 'Debl'],
      },
      {
        name: 'Marjeyoun',
        cities: ['Marjeyoun', 'Deir Mimas', 'Khiam', 'Ibl Es Saqi', 'Kherbet Qanafar'],
      },
      {
        name: 'Hasbaya',
        cities: ['Hasbaya', 'Rashaya', 'Deir El Ahmar', 'Kherbet Qanafar', 'Majdel Balhiss'],
      },
    ],
  },
  {
    name: 'Bekaa',
    districts: [
      {
        name: 'Zahle',
        cities: ['Zahle', 'Bar Elias', 'Taalabaya', 'Kherbet Qanafar', 'Saghbine', 'Taanayel', 'Riyaq'],
      },
      {
        name: 'West Bekaa',
        cities: ['Joub Jannine', 'Yohmor', 'Saghbine', 'Lala', 'Qaraoun'],
      },
      {
        name: 'Rachaya',
        cities: ['Rachaya', 'Yanta', 'Kherbet Qanafar', 'Ain Arab', 'Deir El Ghazal'],
      },
    ],
  },
  {
    name: 'Baalbek-Hermel',
    districts: [
      {
        name: 'Baalbek',
        cities: ['Baalbek', 'Taalabaya', 'Aarsal', 'Younine', 'Qabb Elias', 'Labweh', 'Nabi Sheet'],
      },
      {
        name: 'Hermel',
        cities: ['Hermel', 'Qasr', 'Nahleh', 'Hawsh El Oumara'],
      },
    ],
  },
];

export function formatLebanonAddress(addr: LebanonAddress): string {
  const parts = [
    addr.building && `Building ${addr.building}`,
    addr.street && `${addr.street} St.`,
    addr.floor && `Floor ${addr.floor}`,
    addr.city,
    addr.district,
    addr.governorate,
    'Lebanon',
  ].filter(Boolean);
  return parts.join(', ');
}
