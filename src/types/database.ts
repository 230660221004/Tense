export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      audit_log: {
        Row: {
          aksi: string;
          created_at: string;
          data_baru: Json | null;
          data_lama: Json | null;
          id: number;
          oleh: string | null;
          record_id: string | null;
          tabel: string;
        };
        ComputedFields: never;
        Insert: {
          aksi: string;
          created_at?: string;
          data_baru?: Json | null;
          data_lama?: Json | null;
          id?: never;
          oleh?: string | null;
          record_id?: string | null;
          tabel: string;
        };
        Update: {
          aksi?: string;
          created_at?: string;
          data_baru?: Json | null;
          data_lama?: Json | null;
          id?: never;
          oleh?: string | null;
          record_id?: string | null;
          tabel?: string;
        };
        Relationships: [];
      };
      dokumen: {
        Row: {
          created_at: string;
          diunggah_oleh: string;
          id: string;
          jenis: Database["public"]["Enums"]["jenis_dokumen"];
          judul: string;
          mime_type: string | null;
          nama_file: string;
          pelanggaran_id: string | null;
          siswa_id: string;
          storage_path: string;
          tindak_lanjut_id: string | null;
          ukuran_bytes: number | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          diunggah_oleh: string;
          id?: string;
          jenis: Database["public"]["Enums"]["jenis_dokumen"];
          judul: string;
          mime_type?: string | null;
          nama_file: string;
          pelanggaran_id?: string | null;
          siswa_id: string;
          storage_path: string;
          tindak_lanjut_id?: string | null;
          ukuran_bytes?: number | null;
        };
        Update: {
          created_at?: string;
          diunggah_oleh?: string;
          id?: string;
          jenis?: Database["public"]["Enums"]["jenis_dokumen"];
          judul?: string;
          mime_type?: string | null;
          nama_file?: string;
          pelanggaran_id?: string | null;
          siswa_id?: string;
          storage_path?: string;
          tindak_lanjut_id?: string | null;
          ukuran_bytes?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "dokumen_diunggah_oleh_fkey";
            columns: ["diunggah_oleh"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dokumen_pelanggaran_id_fkey";
            columns: ["pelanggaran_id"];
            isOneToOne: false;
            referencedRelation: "pelanggaran";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dokumen_pelanggaran_id_fkey";
            columns: ["pelanggaran_id"];
            isOneToOne: false;
            referencedRelation: "v_arsip_pelanggaran";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dokumen_siswa_id_fkey";
            columns: ["siswa_id"];
            isOneToOne: false;
            referencedRelation: "siswa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "dokumen_tindak_lanjut_id_fkey";
            columns: ["tindak_lanjut_id"];
            isOneToOne: false;
            referencedRelation: "tindak_lanjut";
            referencedColumns: ["id"];
          },
        ];
      };
      jenis_pelanggaran: {
        Row: {
          aktif: boolean;
          bobot_poin: number;
          created_at: string;
          deskripsi: string | null;
          id: string;
          kode: string;
          nama: string;
          pasal: number;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          aktif?: boolean;
          bobot_poin: number;
          created_at?: string;
          deskripsi?: string | null;
          id?: string;
          kode: string;
          nama: string;
          pasal: number;
          updated_at?: string;
        };
        Update: {
          aktif?: boolean;
          bobot_poin?: number;
          created_at?: string;
          deskripsi?: string | null;
          id?: string;
          kode?: string;
          nama?: string;
          pasal?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      kelas: {
        Row: {
          created_at: string;
          id: string;
          nama: string;
          tahun_ajaran_id: string;
          tingkat: number;
          wali_kelas_id: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id?: string;
          nama: string;
          tahun_ajaran_id: string;
          tingkat: number;
          wali_kelas_id?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          nama?: string;
          tahun_ajaran_id?: string;
          tingkat?: number;
          wali_kelas_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "kelas_tahun_ajaran_id_fkey";
            columns: ["tahun_ajaran_id"];
            isOneToOne: false;
            referencedRelation: "tahun_ajaran";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "kelas_wali_kelas_id_fkey";
            columns: ["wali_kelas_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      notifikasi: {
        Row: {
          created_at: string;
          dibaca_at: string | null;
          id: string;
          isi: string | null;
          judul: string;
          tautan: string | null;
          tipe: string;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          dibaca_at?: string | null;
          id?: string;
          isi?: string | null;
          judul: string;
          tautan?: string | null;
          tipe?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          dibaca_at?: string | null;
          id?: string;
          isi?: string | null;
          judul?: string;
          tautan?: string | null;
          tipe?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notifikasi_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      orang_tua_siswa: {
        Row: {
          created_at: string;
          hubungan: string;
          id: string;
          orang_tua_id: string;
          siswa_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          hubungan?: string;
          id?: string;
          orang_tua_id: string;
          siswa_id: string;
        };
        Update: {
          created_at?: string;
          hubungan?: string;
          id?: string;
          orang_tua_id?: string;
          siswa_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "orang_tua_siswa_orang_tua_id_fkey";
            columns: ["orang_tua_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orang_tua_siswa_siswa_id_fkey";
            columns: ["siswa_id"];
            isOneToOne: false;
            referencedRelation: "siswa";
            referencedColumns: ["id"];
          },
        ];
      };
      pelanggaran: {
        Row: {
          catatan_keputusan: string | null;
          created_at: string;
          deskripsi: string | null;
          diputuskan_oleh: string | null;
          diputuskan_pada: string | null;
          disahkan_pada: string | null;
          id: string;
          jalur: Database["public"]["Enums"]["jalur_pelanggaran"];
          jenis_pelanggaran_id: string;
          kelas_id: string | null;
          pengusul_id: string;
          poin: number;
          siswa_id: string;
          status: Database["public"]["Enums"]["status_pelanggaran"];
          tahun_ajaran_id: string | null;
          tanggal_kejadian: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          catatan_keputusan?: string | null;
          created_at?: string;
          deskripsi?: string | null;
          diputuskan_oleh?: string | null;
          diputuskan_pada?: string | null;
          disahkan_pada?: string | null;
          id?: string;
          jalur?: Database["public"]["Enums"]["jalur_pelanggaran"];
          jenis_pelanggaran_id: string;
          kelas_id?: string | null;
          pengusul_id: string;
          poin: number;
          siswa_id: string;
          status?: Database["public"]["Enums"]["status_pelanggaran"];
          tahun_ajaran_id?: string | null;
          tanggal_kejadian?: string;
          updated_at?: string;
        };
        Update: {
          catatan_keputusan?: string | null;
          created_at?: string;
          deskripsi?: string | null;
          diputuskan_oleh?: string | null;
          diputuskan_pada?: string | null;
          disahkan_pada?: string | null;
          id?: string;
          jalur?: Database["public"]["Enums"]["jalur_pelanggaran"];
          jenis_pelanggaran_id?: string;
          kelas_id?: string | null;
          pengusul_id?: string;
          poin?: number;
          siswa_id?: string;
          status?: Database["public"]["Enums"]["status_pelanggaran"];
          tahun_ajaran_id?: string | null;
          tanggal_kejadian?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pelanggaran_diputuskan_oleh_fkey";
            columns: ["diputuskan_oleh"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pelanggaran_jenis_pelanggaran_id_fkey";
            columns: ["jenis_pelanggaran_id"];
            isOneToOne: false;
            referencedRelation: "jenis_pelanggaran";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pelanggaran_kelas_id_fkey";
            columns: ["kelas_id"];
            isOneToOne: false;
            referencedRelation: "kelas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pelanggaran_pengusul_id_fkey";
            columns: ["pengusul_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pelanggaran_siswa_id_fkey";
            columns: ["siswa_id"];
            isOneToOne: false;
            referencedRelation: "siswa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pelanggaran_tahun_ajaran_id_fkey";
            columns: ["tahun_ajaran_id"];
            isOneToOne: false;
            referencedRelation: "tahun_ajaran";
            referencedColumns: ["id"];
          },
        ];
      };
      pelanggaran_status_log: {
        Row: {
          catatan: string | null;
          created_at: string;
          id: number;
          oleh: string | null;
          pelanggaran_id: string;
          status_dari: Database["public"]["Enums"]["status_pelanggaran"] | null;
          status_ke: Database["public"]["Enums"]["status_pelanggaran"];
        };
        ComputedFields: never;
        Insert: {
          catatan?: string | null;
          created_at?: string;
          id?: never;
          oleh?: string | null;
          pelanggaran_id: string;
          status_dari?:
            Database["public"]["Enums"]["status_pelanggaran"] | null;
          status_ke: Database["public"]["Enums"]["status_pelanggaran"];
        };
        Update: {
          catatan?: string | null;
          created_at?: string;
          id?: never;
          oleh?: string | null;
          pelanggaran_id?: string;
          status_dari?:
            Database["public"]["Enums"]["status_pelanggaran"] | null;
          status_ke?: Database["public"]["Enums"]["status_pelanggaran"];
        };
        Relationships: [
          {
            foreignKeyName: "pelanggaran_status_log_oleh_fkey";
            columns: ["oleh"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pelanggaran_status_log_pelanggaran_id_fkey";
            columns: ["pelanggaran_id"];
            isOneToOne: false;
            referencedRelation: "pelanggaran";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pelanggaran_status_log_pelanggaran_id_fkey";
            columns: ["pelanggaran_id"];
            isOneToOne: false;
            referencedRelation: "v_arsip_pelanggaran";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          aktif: boolean;
          created_at: string;
          id: string;
          nama_lengkap: string;
          no_hp: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          aktif?: boolean;
          created_at?: string;
          id: string;
          nama_lengkap: string;
          no_hp?: string | null;
          role: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Update: {
          aktif?: boolean;
          created_at?: string;
          id?: string;
          nama_lengkap?: string;
          no_hp?: string | null;
          role?: Database["public"]["Enums"]["user_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          endpoint: string;
          id: string;
          p256dh: string;
          user_agent: string | null;
          user_id: string;
        };
        ComputedFields: never;
        Insert: {
          auth: string;
          created_at?: string;
          endpoint: string;
          id?: string;
          p256dh: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      remisi: {
        Row: {
          created_at: string;
          dicatat_oleh: string;
          id: string;
          jumlah_poin: number;
          keterangan: string;
          siswa_id: string;
          surat_dokumen_id: string;
          tanggal: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          dicatat_oleh: string;
          id?: string;
          jumlah_poin: number;
          keterangan: string;
          siswa_id: string;
          surat_dokumen_id: string;
          tanggal?: string;
        };
        Update: {
          created_at?: string;
          dicatat_oleh?: string;
          id?: string;
          jumlah_poin?: number;
          keterangan?: string;
          siswa_id?: string;
          surat_dokumen_id?: string;
          tanggal?: string;
        };
        Relationships: [
          {
            foreignKeyName: "remisi_dicatat_oleh_fkey";
            columns: ["dicatat_oleh"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remisi_siswa_id_fkey";
            columns: ["siswa_id"];
            isOneToOne: false;
            referencedRelation: "siswa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remisi_surat_dokumen_id_fkey";
            columns: ["surat_dokumen_id"];
            isOneToOne: false;
            referencedRelation: "dokumen";
            referencedColumns: ["id"];
          },
        ];
      };
      remisi_pengajuan: {
        Row: {
          alasan: string;
          catatan_kepsek: string | null;
          catatan_tanse: string | null;
          created_at: string;
          diajukan_oleh: string;
          diputuskan_at: string | null;
          diputuskan_oleh: string | null;
          diverifikasi_at: string | null;
          diverifikasi_oleh: string | null;
          dokumen_id: string;
          id: string;
          poin_disahkan: number | null;
          poin_rekomendasi: number | null;
          remisi_id: string | null;
          siswa_id: string;
          status: Database["public"]["Enums"]["status_remisi_pengajuan"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "remisi_pengajuan_pengaju_fkey";
            columns: ["diajukan_oleh"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remisi_pengajuan_siswa_fkey";
            columns: ["siswa_id"];
            isOneToOne: false;
            referencedRelation: "siswa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remisi_pengajuan_dokumen_fkey";
            columns: ["dokumen_id"];
            isOneToOne: false;
            referencedRelation: "dokumen";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remisi_pengajuan_verif_fkey";
            columns: ["diverifikasi_oleh"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "remisi_pengajuan_putus_fkey";
            columns: ["diputuskan_oleh"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      siswa: {
        Row: {
          alamat: string | null;
          created_at: string;
          id: string;
          jenis_kelamin: string | null;
          kelas_id: string | null;
          nama_lengkap: string;
          nama_orang_tua: string | null;
          nis: string;
          nisn: string | null;
          no_hp_orang_tua: string | null;
          profile_id: string | null;
          status: Database["public"]["Enums"]["status_siswa"];
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          alamat?: string | null;
          created_at?: string;
          id?: string;
          jenis_kelamin?: string | null;
          kelas_id?: string | null;
          nama_lengkap: string;
          nama_orang_tua?: string | null;
          nis: string;
          nisn?: string | null;
          no_hp_orang_tua?: string | null;
          profile_id?: string | null;
          status?: Database["public"]["Enums"]["status_siswa"];
          updated_at?: string;
        };
        Update: {
          alamat?: string | null;
          created_at?: string;
          id?: string;
          jenis_kelamin?: string | null;
          kelas_id?: string | null;
          nama_lengkap?: string;
          nama_orang_tua?: string | null;
          nis?: string;
          nisn?: string | null;
          no_hp_orang_tua?: string | null;
          profile_id?: string | null;
          status?: Database["public"]["Enums"]["status_siswa"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "siswa_kelas_id_fkey";
            columns: ["kelas_id"];
            isOneToOne: false;
            referencedRelation: "kelas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "siswa_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      surat: {
        Row: {
          created_at: string;
          dibuat_oleh: string;
          difinalisasi_pada: string | null;
          dokumen_id: string | null;
          id: string;
          isi: string;
          jenis: Database["public"]["Enums"]["jenis_surat"];
          judul: string;
          nomor_surat: string | null;
          siswa_id: string;
          status: Database["public"]["Enums"]["status_surat"];
          tindak_lanjut_id: string | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          dibuat_oleh: string;
          difinalisasi_pada?: string | null;
          dokumen_id?: string | null;
          id?: string;
          isi: string;
          jenis: Database["public"]["Enums"]["jenis_surat"];
          judul: string;
          nomor_surat?: string | null;
          siswa_id: string;
          status?: Database["public"]["Enums"]["status_surat"];
          tindak_lanjut_id?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          dibuat_oleh?: string;
          difinalisasi_pada?: string | null;
          dokumen_id?: string | null;
          id?: string;
          isi?: string;
          jenis?: Database["public"]["Enums"]["jenis_surat"];
          judul?: string;
          nomor_surat?: string | null;
          siswa_id?: string;
          status?: Database["public"]["Enums"]["status_surat"];
          tindak_lanjut_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "surat_dibuat_oleh_fkey";
            columns: ["dibuat_oleh"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "surat_dokumen_id_fkey";
            columns: ["dokumen_id"];
            isOneToOne: false;
            referencedRelation: "dokumen";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "surat_siswa_id_fkey";
            columns: ["siswa_id"];
            isOneToOne: false;
            referencedRelation: "siswa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "surat_tindak_lanjut_id_fkey";
            columns: ["tindak_lanjut_id"];
            isOneToOne: false;
            referencedRelation: "tindak_lanjut";
            referencedColumns: ["id"];
          },
        ];
      };
      tahun_ajaran: {
        Row: {
          aktif: boolean;
          created_at: string;
          id: string;
          nama: string;
          tanggal_mulai: string;
          tanggal_selesai: string;
        };
        ComputedFields: never;
        Insert: {
          aktif?: boolean;
          created_at?: string;
          id?: string;
          nama: string;
          tanggal_mulai: string;
          tanggal_selesai: string;
        };
        Update: {
          aktif?: boolean;
          created_at?: string;
          id?: string;
          nama?: string;
          tanggal_mulai?: string;
          tanggal_selesai?: string;
        };
        Relationships: [];
      };
      template_surat: {
        Row: {
          aktif: boolean;
          id: string;
          isi: string;
          jenis: Database["public"]["Enums"]["jenis_surat"];
          judul: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          aktif?: boolean;
          id?: string;
          isi: string;
          jenis: Database["public"]["Enums"]["jenis_surat"];
          judul: string;
          updated_at?: string;
        };
        Update: {
          aktif?: boolean;
          id?: string;
          isi?: string;
          jenis?: Database["public"]["Enums"]["jenis_surat"];
          judul?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tindak_lanjut: {
        Row: {
          created_at: string;
          dibuat_oleh: string | null;
          id: string;
          jenis: Database["public"]["Enums"]["jenis_sanksi"];
          keterangan: string | null;
          siswa_id: string;
          status: Database["public"]["Enums"]["status_tindak_lanjut"];
          tanggal: string;
          tanggal_selesai: string | null;
          tingkat_sanksi_id: string | null;
          total_poin_saat_dibuat: number | null;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          dibuat_oleh?: string | null;
          id?: string;
          jenis: Database["public"]["Enums"]["jenis_sanksi"];
          keterangan?: string | null;
          siswa_id: string;
          status?: Database["public"]["Enums"]["status_tindak_lanjut"];
          tanggal?: string;
          tanggal_selesai?: string | null;
          tingkat_sanksi_id?: string | null;
          total_poin_saat_dibuat?: number | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          dibuat_oleh?: string | null;
          id?: string;
          jenis?: Database["public"]["Enums"]["jenis_sanksi"];
          keterangan?: string | null;
          siswa_id?: string;
          status?: Database["public"]["Enums"]["status_tindak_lanjut"];
          tanggal?: string;
          tanggal_selesai?: string | null;
          tingkat_sanksi_id?: string | null;
          total_poin_saat_dibuat?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tindak_lanjut_dibuat_oleh_fkey";
            columns: ["dibuat_oleh"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tindak_lanjut_siswa_id_fkey";
            columns: ["siswa_id"];
            isOneToOne: false;
            referencedRelation: "siswa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tindak_lanjut_tingkat_sanksi_id_fkey";
            columns: ["tingkat_sanksi_id"];
            isOneToOne: false;
            referencedRelation: "tingkat_sanksi";
            referencedColumns: ["id"];
          },
        ];
      };
      tingkat_sanksi: {
        Row: {
          aktif: boolean;
          ambang_poin: number;
          created_at: string;
          deskripsi: string | null;
          id: string;
          jenis: Database["public"]["Enums"]["jenis_sanksi"];
          nama: string;
        };
        ComputedFields: never;
        Insert: {
          aktif?: boolean;
          ambang_poin: number;
          created_at?: string;
          deskripsi?: string | null;
          id?: string;
          jenis: Database["public"]["Enums"]["jenis_sanksi"];
          nama: string;
        };
        Update: {
          aktif?: boolean;
          ambang_poin?: number;
          created_at?: string;
          deskripsi?: string | null;
          id?: string;
          jenis?: Database["public"]["Enums"]["jenis_sanksi"];
          nama?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      v_arsip_pelanggaran: {
        Row: {
          created_at: string;
          deskripsi: string | null;
          diputuskan_pada: string | null;
          disahkan_pada: string | null;
          id: string;
          jalur: Database["public"]["Enums"]["jalur_pelanggaran"];
          jenis_nama: string;
          jenis_pelanggaran_id: string;
          kelas_id: string | null;
          kelas_nama: string | null;
          kode: string;
          nis: string;
          pasal: number;
          pengusul_id: string;
          pengusul_nama: string | null;
          poin: number;
          siswa_id: string;
          siswa_nama: string;
          status: Database["public"]["Enums"]["status_pelanggaran"];
          tahun_ajaran_id: string | null;
          tanggal_kejadian: string;
          tingkat: number | null;
        };
        ComputedFields: never;
        Relationships: [
          {
            foreignKeyName: "pelanggaran_jenis_pelanggaran_id_fkey";
            columns: ["jenis_pelanggaran_id"];
            isOneToOne: false;
            referencedRelation: "jenis_pelanggaran";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pelanggaran_kelas_id_fkey";
            columns: ["kelas_id"];
            isOneToOne: false;
            referencedRelation: "kelas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pelanggaran_pengusul_id_fkey";
            columns: ["pengusul_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pelanggaran_siswa_id_fkey";
            columns: ["siswa_id"];
            isOneToOne: false;
            referencedRelation: "siswa";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pelanggaran_tahun_ajaran_id_fkey";
            columns: ["tahun_ajaran_id"];
            isOneToOne: false;
            referencedRelation: "tahun_ajaran";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      _notify: {
        Args: {
          p_isi: string;
          p_judul: string;
          p_tautan: string;
          p_tipe: string;
          p_user: string;
        };
        Returns: undefined;
      };
      _notify_roles: {
        Args: {
          p_isi: string;
          p_judul: string;
          p_roles: Database["public"]["Enums"]["user_role"][];
          p_tautan: string;
          p_tipe: string;
        };
        Returns: undefined;
      };
      _poin_bersih: {
        Args: { p_siswa: string; p_ta: string };
        Returns: {
          poin_bersih: number;
          total_poin: number;
          total_remisi: number;
        }[];
      };
      app_role: {
        Args: Record<PropertyKey, never>;
        Returns: Database["public"]["Enums"]["user_role"];
      };
      can_view_pelanggaran: {
        Args: {
          p_pengusul: string;
          p_siswa: string;
          p_status: Database["public"]["Enums"]["status_pelanggaran"];
        };
        Returns: boolean;
      };
      can_view_rekam_siswa: { Args: { p_siswa: string }; Returns: boolean };
      can_view_siswa: { Args: { p_siswa: string }; Returns: boolean };
      dashboard_ringkasan: {
        Args: { p_tahun_ajaran_id: string };
        Returns: Json;
      };
      finalisasi_surat: {
        Args: { p_id: string };
        Returns: {
          created_at: string;
          dibuat_oleh: string;
          difinalisasi_pada: string | null;
          dokumen_id: string | null;
          id: string;
          isi: string;
          jenis: Database["public"]["Enums"]["jenis_surat"];
          judul: string;
          nomor_surat: string | null;
          siswa_id: string;
          status: Database["public"]["Enums"]["status_surat"];
          tindak_lanjut_id: string | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "surat";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      has_role: {
        Args: { roles: Database["public"]["Enums"]["user_role"][] };
        Returns: boolean;
      };
      is_staff: { Args: Record<PropertyKey, never>; Returns: boolean };
      is_wali_kelas_siswa: { Args: { p_siswa: string }; Returns: boolean };
      kontak_siswa: {
        Args: { p_siswa: string };
        Returns: { alamat: string | null; no_hp_orang_tua: string | null }[];
      };
      ajukan_remisi: {
        Args: { p_alasan: string; p_dokumen: string; p_siswa: string };
        Returns: string;
      };
      perbaiki_remisi: {
        Args: { p_alasan: string; p_dokumen?: string; p_id: string };
        Returns: undefined;
      };
      putuskan_remisi: {
        Args: { p_catatan: string; p_id: string; p_poin: number; p_setuju: boolean };
        Returns: undefined;
      };
      verifikasi_remisi: {
        Args: { p_aksi: string; p_catatan: string; p_id: string; p_poin: number };
        Returns: undefined;
      };
      rekap_poin_siswa: {
        Args: { p_siswa_id?: string; p_tahun_ajaran_id: string };
        Returns: {
          poin_bersih: number;
          siswa_id: string;
          total_poin: number;
          total_remisi: number;
        }[];
      };
      revisi_dan_sahkan_pelanggaran: {
        Args: {
          p_catatan?: string;
          p_deskripsi: string;
          p_id: string;
          p_jenis_pelanggaran_id: string;
        };
        Returns: {
          catatan_keputusan: string | null;
          created_at: string;
          deskripsi: string | null;
          diputuskan_oleh: string | null;
          diputuskan_pada: string | null;
          disahkan_pada: string | null;
          id: string;
          jalur: Database["public"]["Enums"]["jalur_pelanggaran"];
          jenis_pelanggaran_id: string;
          kelas_id: string | null;
          pengusul_id: string;
          poin: number;
          siswa_id: string;
          status: Database["public"]["Enums"]["status_pelanggaran"];
          tahun_ajaran_id: string | null;
          tanggal_kejadian: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "pelanggaran";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      set_tahun_ajaran_aktif: { Args: { p_id: string }; Returns: undefined };
      show_limit: { Args: Record<PropertyKey, never>; Returns: number };
      show_trgm: { Args: { "": string }; Returns: string[] };
      siswa_ambang: {
        Args: { p_tahun_ajaran_id: string };
        Returns: {
          ambang_jenis: Database["public"]["Enums"]["jenis_sanksi"];
          ambang_nama: string;
          ambang_poin: number;
          poin_bersih: number;
          siswa_id: string;
        }[];
      };
      tahun_ajaran_aktif_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
      transisi_pelanggaran_diizinkan: {
        Args: {
          p_dari: Database["public"]["Enums"]["status_pelanggaran"];
          p_is_pengusul: boolean;
          p_ke: Database["public"]["Enums"]["status_pelanggaran"];
          p_role: Database["public"]["Enums"]["user_role"];
        };
        Returns: boolean;
      };
      ubah_status_pelanggaran: {
        Args: {
          p_catatan?: string;
          p_id: string;
          p_status: Database["public"]["Enums"]["status_pelanggaran"];
        };
        Returns: {
          catatan_keputusan: string | null;
          created_at: string;
          deskripsi: string | null;
          diputuskan_oleh: string | null;
          diputuskan_pada: string | null;
          disahkan_pada: string | null;
          id: string;
          jalur: Database["public"]["Enums"]["jalur_pelanggaran"];
          jenis_pelanggaran_id: string;
          kelas_id: string | null;
          pengusul_id: string;
          poin: number;
          siswa_id: string;
          status: Database["public"]["Enums"]["status_pelanggaran"];
          tahun_ajaran_id: string | null;
          tanggal_kejadian: string;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "pelanggaran";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      jalur_pelanggaran: "usulan" | "langsung";
      jenis_dokumen:
        | "bukti_pelanggaran"
        | "surat_pernyataan"
        | "surat_remisi"
        | "surat_keluar"
        | "lainnya";
      jenis_sanksi:
        | "pembinaan"
        | "teguran_tertulis"
        | "panggilan_orang_tua"
        | "skorsing"
        | "dikembalikan_ke_orang_tua";
      jenis_surat:
        | "panggilan_orang_tua"
        | "peringatan"
        | "skorsing"
        | "pernyataan_siswa"
        | "berita_acara";
      status_remisi_pengajuan:
        | "diajukan"
        | "perlu_perbaikan"
        | "direkomendasikan"
        | "disetujui"
        | "ditolak_tanse"
        | "ditolak_kepsek";
      status_pelanggaran:
        | "menunggu_persetujuan"
        | "disetujui"
        | "disahkan"
        | "ditolak"
        | "dibatalkan";
      status_siswa: "aktif" | "nonaktif" | "lulus" | "pindah" | "dikeluarkan";
      status_surat: "draft" | "final" | "dibatalkan";
      status_tindak_lanjut:
        "direncanakan" | "berjalan" | "selesai" | "dibatalkan";
      user_role:
        "admin" | "bk" | "kepala_sekolah" | "guru" | "siswa" | "orang_tua";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      jalur_pelanggaran: ["usulan", "langsung"],
      jenis_dokumen: [
        "bukti_pelanggaran",
        "surat_pernyataan",
        "surat_remisi",
        "surat_keluar",
        "lainnya",
      ],
      jenis_sanksi: [
        "pembinaan",
        "teguran_tertulis",
        "panggilan_orang_tua",
        "skorsing",
        "dikembalikan_ke_orang_tua",
      ],
      jenis_surat: [
        "panggilan_orang_tua",
        "peringatan",
        "skorsing",
        "pernyataan_siswa",
        "berita_acara",
      ],
      status_remisi_pengajuan: [
        "diajukan",
        "perlu_perbaikan",
        "direkomendasikan",
        "disetujui",
        "ditolak_tanse",
        "ditolak_kepsek",
      ],
      status_pelanggaran: [
        "menunggu_persetujuan",
        "disetujui",
        "disahkan",
        "ditolak",
        "dibatalkan",
      ],
      status_siswa: ["aktif", "nonaktif", "lulus", "pindah", "dikeluarkan"],
      status_surat: ["draft", "final", "dibatalkan"],
      status_tindak_lanjut: [
        "direncanakan",
        "berjalan",
        "selesai",
        "dibatalkan",
      ],
      user_role: [
        "admin",
        "bk",
        "kepala_sekolah",
        "guru",
        "siswa",
        "orang_tua",
      ],
    },
  },
} as const;
