export interface Table {
  name: string;
  columns: string[];
  description: string;
}

export interface Action {
  name: string;
  table: string;
  steps: string[];
  access: string[];
  description: string;
}

export interface View {
  name: string;
  table: string;
  style: "gallery" | "board" | "table";
  position: "main_menu" | "side_menu";
  columns_displayed: string[];
}

export interface ERPDesign {
  tables: Table[];
  actions: Action[];
  views: View[];
  main_color: string;
}

export interface SessionData {
  values: {
    messages: any[];
    company_name: string;
    is_finished: boolean;
    erp_design: ERPDesign;
    feedback: string;
  };
  next: string[];
  tasks: any[];
  metadata: any;
  created_at: string;
  checkpoint: {
    checkpoint_id: string;
    thread_id: string;
  };
  parent_checkpoint: {
    checkpoint_id: string;
    thread_id: string;
  };
}
