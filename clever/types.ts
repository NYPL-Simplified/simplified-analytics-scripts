export type Token = {
  id: string;
  created: string;
  owner: {
    type: "district";
    id: string;
  };
  access_token: string;
  scopes: string[];
};

export type District = {
  id: string;
  name: string;
  sis_type: string;
  launch_date: string;
  links: {
    self: string;
  };
  portal_url: string;
  login_methods: string[];
  last_sync?: string;
  mdr_number?: string;
  nces_id?: string;
  error?: string;
  state?: "running" | "pending" | "error" | "paused" | "success" | "";
  pause_start?: string;
  pause_end?: string;
  district_contact?: {
    district: string;
    name: {
      first?: string;
      last?: string;
    };
    email?: string;
    title?: string;
    id?: string;
  };
};

export type DistrictData = {
  data: District;
};

export type DistrictIdMap = {
  id: string;
  access_token: string;
};

export type DistrictAdminContacts = {
  name: string | undefined;
  id: string | undefined;
  nces_id: string | undefined;
  contact: string | undefined;
  email: string | undefined;
  title: string | undefined;
};

export type School = {
  id: string;
  district: string;
  name: string;
  created: string;
  last_modified: string;
  sis_id: string;
  school_number: string;
  links: {
    self: string;
    district: string;
    sections: string;
    users: string;
    terms: string;
    courses: string;
  };
  state_id?: string;
  nces_id?: string;
  mdr_number?: string;
  low_grade?: string;
  high_grade?: string;
  principal?: {
    name?: string;
    email?: string;
  };
  location?: {
    address?: string;
    city?: string;
    state?: string;
    zip?: string;
  };
  phone?: string;
  ext?: Record<string, any>;
};

export type SchoolData = {
  data: School;
};

export type SchoolLocation = {
  id: string;
  city?: string;
  state?: string;
  zip?: string;
};

export type User = {
  id: string;
  district: string;
  name: {
    first: string;
    last: string;
    middle?: string;
  };
  created: string;
  last_modified: string;
  links: {
    self: string;
    district: string;
    schools: string;
    sections: string;
    myContacts: string;
    myTeachers: string;
    myStudents: string;
  };
  email?: string;
};

export type Teacher = User & {
  roles: {
    teacher: {
      legacy_id: string;
      school: string;
      schools: string[];
      sis_id: string;
      teacher_number?: string;
      state_id?: string;
      ext?: Record<string, any>;
      title?: string;
      credentials?: {
        district_username?: string;
      };
    };
  };
};

export type TeacherData = { data: Teacher };

export type DistrictAdmin = User & {
  roles: {
    district_admin: {
      legacy_id: string;
      title?: string;
    };
  };
};

export type DistrictAdminData = { data: DistrictAdmin };
