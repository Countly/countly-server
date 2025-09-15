declare module 'countly-sdk-nodejs' {
  interface CountlyInit {
    app_key: string;
    url: string;
    device_id?: string;
    debug?: boolean;
    interval?: number;
    max_events?: number;
  }

  interface CountlyEvent {
    key: string;
    count?: number;
    sum?: number;
    dur?: number;
    segmentation?: Record<string, any>;
    timestamp?: number;
  }

  interface CountlyUserDetails {
    name?: string;
    username?: string;
    email?: string;
    organization?: string;
    phone?: string;
    picture?: string;
    gender?: string;
    byear?: number;
    custom?: Record<string, any>;
  }

  interface CountlyError {
    _custom?: Record<string, any>;
  }

  const Countly: {
    init(config: CountlyInit): void;
    begin_session(): void;
    end_session(): void;
    session_duration(seconds: number): void;
    add_event(event: CountlyEvent): void;
    user_details(details: CountlyUserDetails): void;
    log_error(error: Error, segments?: CountlyError): void;
  };

  export = Countly;
}
