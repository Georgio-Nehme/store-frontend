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
        cities: ['Achrafieh', 'Ain El Mreisseh', 'Bachoura', 'Basta', 'Hamra', 'Mazraa', 'Medawar', 'Mina El Hosn', 'Moussaitbeh', 'Rmeil', 'Saifi', 'Zokak El Blatt', 'Ras El Nab3a', 'Mar Elias', 'Verdun', 'Sanayeh', 'Clemenceau', 'Tallet El Khayat', 'Sodeco', 'Gemmayzeh', 'Mar Mikhael', 'Ashrafieh', 'Badaro', 'Sassine', 'Monot', 'Furn El Chebbak (partial)'],
      },
    ],
  },
  {
    name: 'Mount Lebanon',
    districts: [
      {
        name: 'Baabda',
        cities: ['Baabda', 'Hadath', 'Chiyah', 'Haret Hreik', 'Burj El Barajneh', 'Mraijeh', 'Ouzai', 'Khalde', 'Doha', 'Aramoun', 'Shweifat', 'Chouaifat', 'Bchamoun', 'Laylaki', 'Kfar Shima', 'Louaizeh', 'Roumieh', 'Beit El Kattar', 'Beit Misk'],
      },
      {
        name: 'Aley',
        cities: ['Aley', 'Bhamdoun', 'Ain Dara', 'Beit Mery', 'Broumana', 'Kfarhbab', 'Souk El Gharb', 'Deir Koubel', 'Mazraat El Chouf', 'Rechmaya', 'Baysour', 'Kfar Matta', 'Chouya', 'Kfarhim', 'Baissour', 'Ain El Jdideh', 'Ain Anoub', 'Bchamoun', 'Khalde', 'Damour', 'Jisr El Bacha'],
      },
      {
        name: 'Metn',
        cities: ['Jdeideh', 'Bourj Hammoud', 'Antelias', 'Mkalles', 'Sin El Fil', 'Dora', 'Mtayleb', 'Zalka', 'Dbayeh', 'Mansourieh', 'Bsalim', 'Bikfaya', 'Bhersaf', 'Rabieh', 'Sed El Baouchrieh', 'Ain El Rummaneh', 'Fanar', 'Kfour', 'Beit El Chaar', 'Majzoub', 'Naccache', 'Ber Elias', 'Baabdat'],
      },
      {
        name: 'Kesrouane',
        cities: ['Jounieh', 'Zouk Mikael', 'Zouk Mosbeh', 'Sarba', 'Adma', 'Ajaltoun', 'Faqra', 'Kfar Debian', 'Harissa', 'Ghazir', 'Nahr El Kalb', 'Tabarja', 'Haret Sakher', 'Blat', 'Kfar Yassine', 'Hjoula', 'Fidar', 'Kfar Aqab', 'Ain Saadeh', 'Bouar', 'Kfar Shima'],
      },
      {
        name: 'Jbeil',
        cities: ['Jbeil', 'Jeita', 'Laqlouq', 'Nahr Ibrahim', 'Lehfed', 'Douma', 'Blat', 'Btaaboura', 'Aqoura', 'Ghosta', 'Kfar Helda', 'Byblos City', 'Amchit', 'Edde', 'Tannourine', 'Majdel Tarchich'],
      },
      {
        name: 'Chouf',
        cities: ['Deir El Qamar', 'Beiteddine', 'Damour', 'Jiyeh', 'Bmahray', 'Moukhtara', 'Baadarane', 'Ain Zhalta', 'Barouk', 'Kfarmatta', 'Chhim', 'Mazboud', 'Gharife', 'Mazraat El Chouf', 'Barja', 'Naameh', 'Rmeileh', 'Ketermaya', 'Saadiyat'],
      },
    ],
  },
  {
    name: 'North Lebanon',
    districts: [
      {
        name: 'Tripoli',
        cities: ['Tripoli', 'Mina', 'Beddawi', 'Qalamoun', 'Abou Samra', 'El Mina', 'Kobbe', 'Zahrieh', 'Bab El Tabbaneh', 'Tall', 'Serail', 'Bab Al Ramel', 'Abi Samra', 'Miten'],
      },
      {
        name: 'Zgharta',
        cities: ['Zgharta', 'Ehden', 'Miziara', 'Kfarsghab', 'Bqaatouta', 'Ardeh', 'Mejdlaya', 'Kfar Helda', 'Bkhashtoula'],
      },
      {
        name: 'Bcharre',
        cities: ['Bcharre', 'Hadchit', 'Qnat', 'Bazoun', 'Hasroun', 'Diman', 'Bane', 'Tourza', 'Btourram'],
      },
      {
        name: 'Koura',
        cities: ['Amioun', 'Kousba', 'Btouratij', 'Daraya', 'Kfar Hazir', 'Ras Maska', 'Barsa', 'Anfeh', 'Kfar Akka', 'Kfar Saroun', 'Heri', 'Blaybel'],
      },
      {
        name: 'Batroun',
        cities: ['Batroun', 'Tannourine', 'Douma', 'Kfour', 'Mayfouq', 'Seraal', 'Chekka', 'Kfar Aabida', 'Ras Maska', 'Kfar Hazir', 'Hamat', 'Hafr', 'El Mine'],
      },
      {
        name: 'Miniyeh-Danniyeh',
        cities: ['Minyeh', 'Sir El Dinniyye', 'Kousba', 'Beino', 'Qelhat', 'Bkarzla', 'Deir Nbouh', 'Bqaa Sefrine', 'Almeh'],
      },
    ],
  },
  {
    name: 'Akkar',
    districts: [
      {
        name: 'Akkar',
        cities: ['Halba', 'Andqet', 'Qoubaiyat', 'Fnaidek', 'Rahbe', 'Akkar El Attiqa', 'Hrar', 'Bire', 'Kherbet Daoud', 'Charbine', 'Mishmish', 'Tikrit', 'Miniara', 'Bqaiaa', 'Masharih', 'Joumeh', 'Borj Arab'],
      },
    ],
  },
  {
    name: 'South Lebanon',
    districts: [
      {
        name: 'Sidon',
        cities: ['Sidon', 'Joun', 'Kfar Falous', 'Ghaziyeh', 'Rmeileh', 'Sarafand', 'Naameh', 'Damour', 'Ansarieh', 'Hlaliyeh', 'Miyeh Miyeh', 'Ain El Hilweh', 'Maghdouche', "Kafr Bir'im", 'Debbiyeh'],
      },
      {
        name: 'Jezzine',
        cities: ['Jezzine', 'Roum', 'Bkassine', 'Aabey', 'Kfarhoune', 'Lala', 'Bater', 'Ain Qana', 'Ain Mjarab', 'Mazraat Moussa'],
      },
      {
        name: 'Tyre',
        cities: ['Tyre', 'Qana', 'Tibnin', 'Jwaya', 'Majdel Zoun', 'Deir Qanoun En Nahr', 'Chamaa', 'Naqoura', 'Bint Jbeil (partial)', 'Tebnine', 'Aadchit', 'Yater', 'Houla', 'Rmeich', 'Ain Baal', 'Rachidieh', 'El Bass'],
      },
    ],
  },
  {
    name: 'Nabatieh',
    districts: [
      {
        name: 'Nabatieh',
        cities: ['Nabatieh', 'Kafra', 'Kfar Roummane', 'Habbouch', 'Siddiqine', 'Ansar', 'Kawthariyat El Sayad', 'Kfar Jarra', 'Arabsalim'],
      },
      {
        name: 'Bint Jbeil',
        cities: ['Bint Jbeil', 'Maroun El Ras', 'Aita El Shaab', 'Yater', 'Debl', 'Kounine', 'Ainata', 'Rmeich', 'Lweizeh', 'Majdel Zoun'],
      },
      {
        name: 'Marjeyoun',
        cities: ['Marjeyoun', 'Deir Mimas', 'Khiam', 'Ibl Es Saqi', 'Kherbet Qanafar', 'Yohmor', 'Kleaa', 'Houla', 'Lala', 'Blida'],
      },
      {
        name: 'Hasbaya',
        cities: ['Hasbaya', 'Rashaya El Wadi', 'Deir El Ahmar', 'Majdel Balhiss', 'Yanta', 'Kafraya', 'Ain El Arab'],
      },
    ],
  },
  {
    name: 'Bekaa',
    districts: [
      {
        name: 'Zahle',
        cities: ['Zahle', 'Bar Elias', 'Taalabaya', 'Kherbet Qanafar', 'Saghbine', 'Taanayel', 'Riyaq', 'Chtaura', 'Ablah', 'Dalhamiyeh', 'Wadi El Delm', 'Qabb Elias'],
      },
      {
        name: 'West Bekaa',
        cities: ['Joub Jannine', 'Yohmor', 'Saghbine', 'Lala', 'Qaraoun', 'Kherbet Qanafar', 'Machghara', 'Yanta', 'Ain Qeniye', 'Deir El Ahmar'],
      },
      {
        name: 'Rachaya',
        cities: ['Rachaya', 'Yanta', 'Ain Arab', 'Deir El Ghazal', 'Kherbet Qanafar', 'Lala', 'Ain Ata', 'Ain Dara', 'Baaloul'],
      },
    ],
  },
  {
    name: 'Baalbek-Hermel',
    districts: [
      {
        name: 'Baalbek',
        cities: ['Baalbek', 'Taalabaya', 'Aarsal', 'Younine', 'Qabb Elias', 'Labweh', 'Nabi Sheet', 'Douris', 'Makneh', 'Yammouneh', 'Deir El Ahmar', 'Brital', 'Chlifa'],
      },
      {
        name: 'Hermel',
        cities: ['Hermel', 'Qasr', 'Nahleh', 'Hawsh El Oumara', 'Laboue', 'Ain Ez Zarqa', 'Fakiha'],
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
