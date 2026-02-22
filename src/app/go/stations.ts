export interface Station {
  code: string;
  name: string;
  line: string;
  hasBus?: boolean;
}

export const STATIONS: Station[] = [
  // Lakeshore West
  { code: "UN", name: "Union Station", line: "Lakeshore West", hasBus: true },
  { code: "EX", name: "Exhibition GO", line: "Lakeshore West" },
  { code: "MI", name: "Mimico GO", line: "Lakeshore West" },
  { code: "LO", name: "Long Branch GO", line: "Lakeshore West" },
  { code: "PO", name: "Port Credit GO", line: "Lakeshore West", hasBus: true },
  { code: "CL", name: "Clarkson GO", line: "Lakeshore West", hasBus: true },
  { code: "OA", name: "Oakville GO", line: "Lakeshore West", hasBus: true },
  { code: "BN", name: "Bronte GO", line: "Lakeshore West" },
  { code: "AP", name: "Appleby GO", line: "Lakeshore West" },
  { code: "BU", name: "Burlington GO", line: "Lakeshore West" },
  { code: "AL", name: "Aldershot GO", line: "Lakeshore West" },

  // Lakeshore East
  { code: "DA", name: "Danforth GO", line: "Lakeshore East" },
  { code: "SC", name: "Scarborough GO", line: "Lakeshore East" },
  { code: "EG", name: "Eglinton GO", line: "Lakeshore East" },
  { code: "GU", name: "Guildwood GO", line: "Lakeshore East" },
  { code: "RO", name: "Rouge Hill GO", line: "Lakeshore East" },
  { code: "PI", name: "Pickering GO", line: "Lakeshore East" },
  { code: "AJ", name: "Ajax GO", line: "Lakeshore East" },
  { code: "WH", name: "Whitby GO", line: "Lakeshore East" },
  { code: "OS", name: "Oshawa GO", line: "Lakeshore East" },

  // Milton
  { code: "BL", name: "Bloor GO", line: "Milton" },
  { code: "KI", name: "Kipling GO", line: "Milton" },
  { code: "DX", name: "Dixie GO", line: "Milton" },
  { code: "CO", name: "Cooksville GO", line: "Milton" },
  { code: "ER", name: "Erindale GO", line: "Milton" },
  { code: "SW", name: "Streetsville GO", line: "Milton" },
  { code: "MW", name: "Meadowvale GO", line: "Milton" },
  { code: "LI", name: "Lisgar GO", line: "Milton" },
  { code: "ML", name: "Milton GO", line: "Milton", hasBus: true },

  // Kitchener
  { code: "WS", name: "Weston GO", line: "Kitchener" },
  { code: "EN", name: "Etobicoke North GO", line: "Kitchener" },
  { code: "MA", name: "Malton GO", line: "Kitchener" },
  { code: "BR", name: "Bramalea GO", line: "Kitchener" },
  { code: "BP", name: "Brampton GO", line: "Kitchener" },
  { code: "MP", name: "Mount Pleasant GO", line: "Kitchener" },
  { code: "GE", name: "Georgetown GO", line: "Kitchener" },
  { code: "AC", name: "Acton GO", line: "Kitchener" },
  { code: "GC", name: "Guelph Central GO", line: "Kitchener" },
  { code: "KT", name: "Kitchener GO", line: "Kitchener" },

  // Barrie
  { code: "DP", name: "Downsview Park GO", line: "Barrie" },
  { code: "RU", name: "Rutherford GO", line: "Barrie" },
  { code: "MK", name: "Maple GO", line: "Barrie" },
  { code: "KC", name: "King City GO", line: "Barrie" },
  { code: "AU", name: "Aurora GO", line: "Barrie" },
  { code: "NW", name: "Newmarket GO", line: "Barrie" },
  { code: "EW", name: "East Gwillimbury GO", line: "Barrie" },
  { code: "BD", name: "Bradford GO", line: "Barrie" },
  { code: "BA", name: "Barrie South GO", line: "Barrie" },
  { code: "AW", name: "Allandale Waterfront GO", line: "Barrie" },

  // Richmond Hill
  { code: "OC", name: "Old Cummer GO", line: "Richmond Hill" },
  { code: "LA", name: "Langstaff GO", line: "Richmond Hill" },
  { code: "RH", name: "Richmond Hill GO", line: "Richmond Hill" },
  { code: "GO", name: "Gormley GO", line: "Richmond Hill" },
  { code: "BM", name: "Bloomington GO", line: "Richmond Hill" },

  // Stouffville
  { code: "AG", name: "Agincourt GO", line: "Stouffville" },
  { code: "MM", name: "Milliken GO", line: "Stouffville" },
  { code: "UV", name: "Unionville GO", line: "Stouffville" },
  { code: "CN", name: "Centennial GO", line: "Stouffville" },
  { code: "ST", name: "Stouffville GO", line: "Stouffville" },
];
