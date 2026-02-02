from supabase import create_client
from config import settings

def get_supabase():
    return create_client(settings.supabase_url, settings.supabase_key)
