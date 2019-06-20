#include <eosio/eosio.hpp>
#include <eosio/system.hpp>
#include <eosio/asset.hpp>
#include <eosio/transaction.hpp>
#include <types.hpp>
#include <eosio/singleton.hpp>
#include <eosio/crypto.hpp>

using namespace eosio;
using namespace std;

CONTRACT smartsignature : public contract
{
    public:
      smartsignature(name receiver, name code, datastream<const char *> ds)
          : contract(receiver, code, ds),
            _globals(_self, _self.value)
      {
            init();
      }

      void handle_transfer(name from, name to, asset quantity, string memo, name code);

      ACTION record(st_log log);

    private:
      TABLE support_info
      {
            name user;
            name contract;
            asset amount;
            name ref;
            time_point_sec create_time;

            uint64_t primary_key() const { return user.value; }

            EOSLIB_SERIALIZE(support_info, (user)(contract)(amount)(ref)(create_time))
      };

      TABLE global_var
      {
            name key;
            uint64_t val;

            uint64_t primary_key() const { return key.value; }
            EOSLIB_SERIALIZE(global_var, (key)(val))
      };

      TABLE order_info
      {
            uint64_t oid;
            name user;
            name contract;
            asset amount;
            name ref;
            time_point_sec create_time;

            uint64_t primary_key() const { return oid; }

            EOSLIB_SERIALIZE(order_info, (oid)(user)(contract)(amount)(ref)(create_time))
      };

      typedef multi_index<"supports"_n, support_info> supports;

      typedef multi_index<"globals"_n, global_var> globals;
      globals _globals;

      typedef multi_index<"orders"_n, order_info> orders;


      // 用户表格，记录收入
      // scope 为用户账户
      struct[[eosio::table("players")]] player_info
      {
            uint64_t sign_income;  // 签名收入
            uint64_t share_income; // 分享收入
      };

      // 分享表格
      // scope 为读者
      struct[[eosio::table("shares")]] share_info
      {
            uint64_t id;    // 签名 id
            uint64_t quota; // 剩余配额
            uint64_t primary_key() const { return id; }
      };

      // 签名表格
      // scope: _self 為此合約
      struct[[eosio::table("signs")]] sign_info
      {
            uint64_t id;             // 签名 id
            name author;             // 作者
            uint64_t fission_factor; // 裂变系数 * 1000
            string ipfs_hash;
            public_key public_key;
            signature signature;
            uint64_t primary_key() const { return id; }
      };

      typedef eosio::multi_index<"shares"_n, share_info> index_share_t;
      typedef eosio::multi_index<"signs"_n, sign_info> index_sign_t;
      typedef singleton<"players"_n, player_info> singleton_players_t;

      void init();

      void support(name from, name code, asset quantity, uint64_t signid, name ref);
      
      void buy(name from, name code, asset quantity, uint64_t signid, name ref);

      uint64_t next_oid();

      void parse_memo(string memo, string * action, uint64_t * signid, name * ref)
      {
            size_t sep_count = count(memo.begin(), memo.end(), ' ');

            size_t pos;
            string container;

            pos = sub2sep(memo, &container, ' ', 0, true);
            *action = container;

            if (sep_count == 1)
            {
                  container = memo.substr(++pos);
                  *signid = atoi(container.c_str());
            }

            if (sep_count == 2)
            {
                  pos = sub2sep(memo, &container, ' ', ++pos, true);
                  *signid = atoi(container.c_str());

                  container = memo.substr(++pos);
                  *ref = name(container);

                  check(is_account(*ref), "Referral is not an existing account."); 
            }
      }

      size_t sub2sep(const string &input,
                     string *output,
                     const char &separator,
                     const size_t &first_pos = 0,
                     const bool &required = false)
      {
            check(first_pos != string::npos, "invalid first pos");
            auto pos = input.find(separator, first_pos);
            if (pos == string::npos)
            {
                  check(!required, "parse memo error");
                  return string::npos;
            }
            *output = input.substr(first_pos, pos - first_pos);
            return pos;
      }
};